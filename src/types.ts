export type Row=Record<string,any>;
export type Page={records:Row[];total:number};
export type Session={user:{id:string;email?:string}|null;admin:boolean};
export type Filters=Record<string,string|number|boolean|undefined>;
