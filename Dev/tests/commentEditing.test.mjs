import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {editOwnedComment} from '../src/lib/commentEditing.ts';

function mockClient(updateRows=[{id:'c1'}],metadata={mentions:[7,8],attachment_url:'keep-me',body:'before'}) {
  const requests=[];
  const client=createClient('https://comment-tests.supabase.co','test-key',{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(url,init)=>{
      requests.push({url:new URL(String(url)),method:init?.method,body:init?.body?JSON.parse(init.body):null});
      return new Response(JSON.stringify(init?.method==='GET'?{metadata}:updateRows),{status:200,headers:{'Content-Type':'application/json'}});
    }},
  });
  return {client,requests};
}

test('editing all comment kinds scopes the author and exact parent',async()=>{
  for(const kind of ['task','project','project_subtask','campaign_subtask','campaign']) {
    const {client,requests}=mockClient();
    await editOwnedComment(client,{kind,id:'p1'},'c1',7,'  updated text  ');
    const patch=requests.find(r=>r.method==='PATCH');
    assert.ok(patch);
    assert.equal(patch.url.searchParams.get('id'),'eq.c1');
    assert.equal(patch.url.searchParams.get('select'),'id');
    if(kind==='task'||kind==='project') {
      assert.equal(patch.url.searchParams.get('author_id'),'eq.7');
      assert.equal(patch.url.searchParams.get(`${kind}_id`),'eq.p1');
      assert.deepEqual(patch.body,{body:'updated text'});
    } else {
      for(const request of requests) {
        assert.equal(request.url.searchParams.get('user_id'),'eq.7');
        assert.equal(request.url.searchParams.get('entity_id'),'eq.p1');
        assert.equal(request.url.searchParams.get('entity_type'),`eq.${kind}`);
        assert.equal(request.url.searchParams.get('action'),'eq.comment');
      }
      assert.deepEqual(patch.body,{metadata:{mentions:[7,8],attachment_url:'keep-me',body:'updated text'}});
    }
  }
});

test('zero updated rows is a failed save',async()=>{
  const {client}=mockClient([]);
  await assert.rejects(editOwnedComment(client,{kind:'task',id:'p1'},'c1',7,'updated'),/không còn tồn tại/);
});

test('blank edits and invalid identity are rejected before sending',async()=>{
  const {client,requests}=mockClient();
  await assert.rejects(editOwnedComment(client,{kind:'project',id:'p1'},'c1',7,'  '));
  await assert.rejects(editOwnedComment(client,{kind:'project',id:'p1'},'c1',0,'updated'));
  assert.equal(requests.length,0);
});

test('activity read denied by RLS cannot proceed to an update',async()=>{
  const requests=[];
  const client=createClient('https://comment-tests.supabase.co','test-key',{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(url,init)=>{requests.push(init?.method);return new Response('null',{status:200,headers:{'Content-Type':'application/json'}});}},
  });
  await assert.rejects(editOwnedComment(client,{kind:'campaign',id:'p1'},'c1',7,'updated'));
  assert.deepEqual(requests,['GET']);
});
