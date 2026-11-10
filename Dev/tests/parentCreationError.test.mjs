import test from 'node:test';
import assert from 'node:assert/strict';
import {parentCreationError} from '../src/lib/parentCreationError.ts';
test('plain PostgREST permission errors describe scope instead of incorrectly blaming connectivity',()=>{
 const text=parentCreationError({code:'42501',message:'new row violates row-level security policy'});
 assert.match(text,/phòng ban hoặc PIC/);assert.doesNotMatch(text,/kết nối|row-level|projects/);
});
test('invalid data and client validation keep actionable separate messages',()=>{
 assert.match(parentCreationError({code:'23514'}),/chưa hợp lệ/);
 assert.equal(parentCreationError(new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.')),'Ngày kết thúc phải từ ngày bắt đầu trở đi.');
 assert.match(parentCreationError(null),/liên hệ Admin/);
});
