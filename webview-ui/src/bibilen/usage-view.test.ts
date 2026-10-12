import {test,expect} from 'vitest';
import {refreshUsage,visibleUsageWindow} from './usage-view.js';
import type {UsageState} from './IntegrationsPanel.js';
const now=1_000_000;const window={usedPercent:40,remainingPercent:60,resetsAt:(now+10000)/1000,expired:false};const usage:UsageState={provider:'Claude',status:'ready',capturedAt:now,fiveHour:window,weekly:window,message:''};
test('failed refresh immediately clears old percentages',async()=>{let value=usage;expect(await refreshUsage(async()=>{throw Error('offline');},v=>value=v,usage)).toBe(false);expect(value.status).toBe('stale');expect(value.fiveHour).toBeNull();expect(visibleUsageWindow(value,window,now)).toBeNull();});
test('reset and stale measurement hide numbers without another CLI update',()=>{expect(visibleUsageWindow(usage,window,now)).toEqual(window);expect(visibleUsageWindow(usage,window,now+10001)).toBeNull();expect(visibleUsageWindow({...usage,capturedAt:now-90001},window,now)).toBeNull();});
