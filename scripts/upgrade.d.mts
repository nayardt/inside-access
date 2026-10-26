export function applyUpgrade(source:string,target:string,options?:{checkRunning?:boolean}):Promise<{target:string;backup:string;hosted:boolean}>;
