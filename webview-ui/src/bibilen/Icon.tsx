import type {SVGProps} from 'react';
const paths={
 menu:'M4 6h16M4 12h16M4 18h16',
 operations:'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
 link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
 home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 tasks:'M8 4H5a1 1 0 0 0-1 1v15h16V5a1 1 0 0 0-1-1h-3M8 2h8v4H8ZM8 11h8M8 16h6',
 team:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M17 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 history:'M3 12a9 9 0 1 0 2.6-6.4M3 3v6h6M12 7v5l3 2',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
 plus:'M12 5v14M5 12h14', minus:'M5 12h14', close:'M6 6l12 12M18 6 6 18',
 expand:'M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5',
 back:'M19 12H5m7-7-7 7 7 7', arrow:'M5 12h14m-7-7 7 7-7 7',
 plan:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16',
 terminal:'m4 6 6 6-6 6m9 0h7',
} as const;
export type IconName=keyof typeof paths;
export function Icon({name,...props}:{name:IconName}&SVGProps<SVGSVGElement>){
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]}/></svg>;
}
