import { apiRequest } from './client';
import type { MoneyView } from './types';
export type LedgerKind='credits'|'debts';
export interface LedgerEntry { id:string;name:string;amount:MoneyView;paid:MoneyView;remaining:MoneyView;dueAt:string|null;settled:boolean; }
export interface Settlement { id:string;amount:MoneyView;reference:string;createdAt:string; }
export interface Page<T> { items:T[];nextOffset:number|null; }
export interface RestaurantEvent {id:string;title:string;body:string|null;starts_at:string;ends_at:string|null;cancelled_at:string|null;}
export interface EventInput {establishmentId:string;title:string;body?:string;startsAt:string;endsAt:string;}
export async function fetchLedger(kind:LedgerKind,establishmentId:string,offset=0){
 return (await apiRequest<Page<LedgerEntry>>(`/merchant/ledgers/${kind}`,{query:{establishmentId,offset}})).data;
}
export async function fetchSettlements(kind:LedgerKind,id:string){
 return (await apiRequest<Settlement[]>(`/merchant/ledgers/${kind}/${id}/settlements`)).data;
}
export async function settleLedger(kind:LedgerKind,id:string,amount:string,reference:string,key:string){
 return (await apiRequest(`/merchant/ledgers/${kind}/${id}/settlements`,{method:'POST',body:{amount,reference},idempotent:true,idempotencyKey:key})).data;
}
export async function fetchManagedEvents(establishmentId:string,offset=0){
 return (await apiRequest<Page<RestaurantEvent> & {timezone:string}>('/merchant/event-management',{query:{establishmentId,offset}})).data;
}
export async function saveEvent(input:EventInput,key:string,id?:string){
 return (await apiRequest(id?`/merchant/event-management/${id}`:'/merchant/event-management',
 {method:id?'PUT':'POST',body:input,idempotent:!id,idempotencyKey:key})).data;
}
export async function cancelEvent(id:string){
 return (await apiRequest(`/merchant/event-management/${id}/cancel`,{method:'POST'})).data;
}
