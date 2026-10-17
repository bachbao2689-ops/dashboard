import { supabase } from './supabase';
import type { StaffProfile } from '../store/authStore';
import {canSubmitAssetRequest,isAssetApprover} from '../lib/roleScope';

export type BorrowAction = 'approve' | 'reject' | 'return';

export const localToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const borrowStatusLabel = (status: string, returnedAt?: string | null) => {
  if (returnedAt) return 'Đã trả';
  return ({ pending: 'Chờ duyệt', approved: 'Đang mượn', rejected: 'Từ chối' } as Record<string, string>)[status] || status;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function releaseAsset(id: string, expectedStatus: string) {
  const { data, error } = await supabase.from('assets')
    .update({ status: 'available', is_available: true })
    .eq('id', id).eq('status', expectedStatus).select('id');
  if (error) throw error;
  assert(data?.length === 1, 'Không thể mở lại thiết bị. Vui lòng kiểm tra trạng thái kho.');
}

export async function submitBorrowRequests(input: {
  assetIds: string[];
  dueDate: string;
  purpose: string;
  profile: StaffProfile | null;
}) {
  const { assetIds, dueDate, purpose, profile } = input;
  assert(profile?.id, 'Vui lòng đăng nhập bằng tài khoản nhân viên để mượn thiết bị.');
  assert(canSubmitAssetRequest(profile), 'Bạn không có quyền gửi yêu cầu mượn thiết bị.');
  assert(assetIds.length > 0 && new Set(assetIds).size === assetIds.length, 'Danh sách thiết bị không hợp lệ.');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(dueDate) && dueDate >= localToday(), 'Hạn trả phải từ hôm nay trở đi.');
  assert(purpose.trim().length > 0, 'Vui lòng nhập lý do mượn.');

  const { data: assets, error: assetError } = await supabase.from('assets')
    .select('id, name, status, is_available, workspace_id')
    .in('id', assetIds);
  if (assetError) throw assetError;
  assert(assets?.length === assetIds.length, 'Có thiết bị không còn trong kho. Vui lòng tải lại danh sách.');
  assert(assets.every(asset => asset.status === 'available' && asset.is_available === true), 'Có thiết bị vừa được giữ hoặc không còn sẵn sàng. Vui lòng tải lại kho.');
  assert(assets.every(asset => asset.workspace_id === assets[0].workspace_id), 'Chỉ có thể mượn các thiết bị cùng một kho.');

  const { data: openRequests, error: requestError } = await supabase.from('borrow_requests')
    .select('asset_id, approval_status, returned_at')
    .in('asset_id', assetIds).in('approval_status', ['pending', 'approved']).is('returned_at', null);
  if (requestError) throw requestError;
  assert(!openRequests?.length, 'Có thiết bị đã có yêu cầu mượn chưa hoàn tất. Vui lòng tải lại kho.');

  const reserved: string[] = [];
  let insertStarted = false;
  try {
    for (const id of assetIds) {
      const { data, error } = await supabase.from('assets')
        .update({ status: 'reserved', is_available: false })
        .eq('id', id).eq('status', 'available').eq('is_available', true).select('id');
      if (error) throw error;
      assert(data?.length === 1, 'Thiết bị vừa được người khác giữ. Vui lòng tải lại kho.');
      reserved.push(id);
    }

    insertStarted = true;
    const { error } = await supabase.from('borrow_requests').insert(assetIds.map(id => ({
      asset_id: id,
      requester_id: profile.id,
      department_id: profile.department_id,
      workspace_id: assets[0].workspace_id,
      borrow_date: localToday(),
      due_date: dueDate,
      purpose: purpose.trim(),
      approval_status: 'pending',
    })));
    if (error) throw error;
  } catch (error) {
    if (insertStarted) {
      const existing = await supabase.from('borrow_requests')
        .select('asset_id, requester_id, approval_status, returned_at')
        .in('asset_id', assetIds).in('approval_status', ['pending', 'approved']).is('returned_at', null);
      if (existing.error) throw new Error('Chưa xác nhận được kết quả gửi. Vui lòng kiểm tra danh sách yêu cầu trước khi thử lại.');
      if (existing.data?.length === assetIds.length && existing.data.every(row => row.requester_id === profile.id)) return;
      if (existing.data?.length) throw new Error('Có yêu cầu đã được tạo nhưng chưa đủ số thiết bị. Vui lòng báo quản lý kho kiểm tra.');
    }
    const releases = await Promise.allSettled(reserved.map(id => releaseAsset(id, 'reserved')));
    if (releases.some(result => result.status === 'rejected')) {
      throw new Error('Không gửi được yêu cầu và có thiết bị chưa mở lại. Vui lòng báo quản lý kho kiểm tra.');
    }
    throw error;
  }
}

export async function transitionBorrowRequest(id: string, action: BorrowAction, profile: StaffProfile | null) {
  assert(profile?.id && isAssetApprover(profile), 'Chỉ Leader Design hoặc Admin được duyệt và xác nhận trả thiết bị.');
  const { data: request, error: readError } = await supabase.from('borrow_requests')
    .select('id, asset_id, approval_status, returned_at').eq('id', id).single();
  if (readError) throw readError;
  assert(request, 'Không tìm thấy yêu cầu mượn.');

  if (action === 'approve') {
    assert(request.approval_status === 'pending' && !request.returned_at, 'Yêu cầu này không còn chờ duyệt.');
    const approvedAt = new Date().toISOString();
    const { data, error } = await supabase.from('borrow_requests')
      .update({ approval_status: 'approved', approved_by: profile.id, approved_at: approvedAt })
      .eq('id', id).eq('approval_status', 'pending').select('id');
    if (error) throw error;
    assert(data?.length === 1, 'Yêu cầu đã thay đổi. Vui lòng tải lại.');
    const claimed = await supabase.from('assets')
      .update({ status: 'borrowed', is_available: false })
      .eq('id', request.asset_id).eq('status', 'reserved').select('id');
    if (claimed.error || claimed.data?.length !== 1) {
      const rollback = await supabase.from('borrow_requests')
        .update({ approval_status: 'pending', approved_by: null, approved_at: null })
        .eq('id', id).eq('approval_status', 'approved').eq('approved_at', approvedAt).select('id');
      if (rollback.error || rollback.data?.length !== 1) throw new Error('Duyệt chưa đồng bộ với trạng thái kho. Vui lòng báo quản lý kiểm tra.');
      throw claimed.error || new Error('Thiết bị không còn ở trạng thái chờ duyệt.');
    }
    return;
  }

  if (action === 'reject') {
    assert(request.approval_status === 'pending' && !request.returned_at, 'Yêu cầu này không còn chờ duyệt.');
    const { data, error } = await supabase.from('borrow_requests')
      .update({ approval_status: 'rejected' }).eq('id', id).eq('approval_status', 'pending').select('id');
    if (error) throw error;
    assert(data?.length === 1, 'Yêu cầu đã thay đổi. Vui lòng tải lại.');
    try {
      await releaseAsset(request.asset_id, 'reserved');
    } catch (releaseError) {
      const rollback = await supabase.from('borrow_requests').update({ approval_status: 'pending' })
        .eq('id', id).eq('approval_status', 'rejected').select('id');
      if (rollback.error || rollback.data?.length !== 1) throw new Error('Từ chối chưa đồng bộ với kho. Vui lòng báo quản lý kiểm tra.');
      throw releaseError;
    }
    return;
  }

  assert(request.approval_status === 'approved' && !request.returned_at, 'Thiết bị này đã được trả hoặc chưa được duyệt.');
  const now = new Date().toISOString();
  const { data, error } = await supabase.from('borrow_requests')
    .update({ returned_at: now, return_confirmed_at: now, return_confirmed_by: profile.id })
    .eq('id', id).eq('approval_status', 'approved').is('returned_at', null).select('id');
  if (error) throw error;
  assert(data?.length === 1, 'Yêu cầu đã thay đổi. Vui lòng tải lại.');
  try {
    await releaseAsset(request.asset_id, 'borrowed');
  } catch (releaseError) {
    const rollback = await supabase.from('borrow_requests')
      .update({ returned_at: null, return_confirmed_at: null, return_confirmed_by: null })
      .eq('id', id).eq('returned_at', now).select('id');
    if (rollback.error || rollback.data?.length !== 1) throw new Error('Trả thiết bị chưa đồng bộ với kho. Vui lòng báo quản lý kiểm tra.');
    throw releaseError;
  }
}
