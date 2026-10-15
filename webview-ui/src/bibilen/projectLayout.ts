import {applyBibilenGarden,isBibilenWorkspace} from './bibilenGarden.js';
import {makeLayout,type Theme} from './layouts.js';
import {applyPlazaCourtyard} from './plazaCourtyard.js';
import {isOneLineWorkspace} from './modernPlaza.js';
import {workspaceId} from './workspace.js';
import type {OfficeLayout} from '../office/types.js';
export const projectLayout=(layout:OfficeLayout)=>applyPlazaCourtyard(applyBibilenGarden(layout,isBibilenWorkspace(workspaceId)),isOneLineWorkspace(workspaceId));
export const makeProjectLayout=(theme:Theme)=>projectLayout(makeLayout(theme));
