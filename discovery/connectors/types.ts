export interface Candidate {
 external_id:string;content_hash:string;title:string;city:string;category:string|null;event_start_date:string|null;event_end_date:string|null;
 date_precision:string;timezone:string;venue?:string|null;description:string|null;access_method?:string|null;access_instructions:string|null;eligibility:string|null;cost_direction:string;
 currency:string|null;price_notes:string|null;organizer:string|null;source_url:string;booking_url:string|null;
 attribution:string;license_url:string;source_updated_at?:string|null;source_published_at?:null;
 image_hints?:{image_url:string;alt_text?:string|null;attribution:string|null;retrieved_at:string}[];
 lifecycle_status?:'active'|'expired'|'closed'|'cancelled'|'sold_out';quality_flags?:string[];relevant?:boolean;evidence?:Record<string,unknown>;
}
export interface ObservationBatch {items:Candidate[];missing_ids:string[];coverage:{note:string;requests:number;sample_limit:number;complete_catalog:false;returned:number;newly_relevant:number;endpoint?:string};}
export interface Connector {key:string;fetch:(trackedIds?:string[])=>Promise<Candidate[]>;check?:(trackedIds?:string[])=>Promise<ObservationBatch>;}
