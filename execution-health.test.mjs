import test from 'node:test';
import assert from 'node:assert/strict';
import {executionResult} from './execution-health.mjs';

test('execution readiness requires a successful real result',()=>{
  assert.equal(executionResult(JSON.stringify({type:'result',result:'BIBILEN_OK',is_error:false}),0).status,'ready');
  assert.equal(executionResult(JSON.stringify({type:'result',result:'BIBILEN_OK',is_error:true}),0).status,'blocked');
  assert.equal(executionResult('logged in',0).status,'unavailable');
  assert.equal(executionResult(JSON.stringify({type:'result',result:'BIBILEN_OK'}),1).status,'unavailable');
});
test('organization rejection is explained without publishing raw account output',()=>{
  const result=executionResult(JSON.stringify({type:'result',is_error:true,api_error_code:'oauth_not_allowed_for_organization',result:'private@example.com'}),1);
  assert.equal(result.status,'blocked');assert.doesNotMatch(result.message,/private@example.com/);
});
