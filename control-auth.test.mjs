import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizedControl, authorizedRequest, validHost } from './control-auth.mjs';
const headers={host:'127.0.0.1:3100',origin:'http://127.0.0.1:3100','sec-websocket-protocol':'bibilen-control'};
test('terminal accepts same-origin access without a management key',()=>{
 assert.equal(authorizedControl(headers),true);
 for(const change of [{origin:'https://evil.test'},{origin:undefined},{host:'evil.test:3100'},{'sec-websocket-protocol':undefined}])assert.equal(authorizedControl({...headers,...change}),false);
});
test('DNS rebinding and public hosts are denied',()=>{assert.equal(validHost('localhost:3100'),true);assert.equal(validHost('attacker.test:3100'),false);assert.equal(validHost('192.168.1.2:3100'),false);});
test('API access rejects cross-site and originless writes',()=>{
 assert.equal(authorizedRequest(headers,'POST'),true);
 assert.equal(authorizedRequest({host:headers.host},'GET'),true);
 assert.equal(authorizedRequest({host:headers.host},'POST'),false);
 assert.equal(authorizedRequest({...headers,origin:'https://evil.test'},'POST'),false);
 assert.equal(authorizedRequest({host:headers.host,'sec-fetch-site':'cross-site'},'GET'),false);
});
