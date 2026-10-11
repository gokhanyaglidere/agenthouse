#!/usr/bin/env node
import {recordUsage} from './usage.mjs';
let raw='';process.stdin.on('data',chunk=>{raw+=chunk;if(raw.length>262144)process.exit(0);});process.stdin.on('end',()=>{try{const value=recordUsage(JSON.parse(raw));const windows=[value.fiveHour&&`5 saat: %${Math.round(value.fiveHour.usedPercent)}`,value.weekly&&`hafta: %${Math.round(value.weekly.usedPercent)}`].filter(Boolean);console.log(`[${value.model}]${windows.length?' · '+windows.join(' · '):''}`);}catch{console.log('[BiBilen]');}});
