import { useInfiniteQuery,useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { useRef,useState } from 'react';
import { View } from 'react-native';
import { createIdempotencyKey } from '@/api/device';
import { fetchLedger,fetchSettlements,settleLedger,type LedgerEntry,type LedgerKind } from '@/api/completion';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { hapticSuccess } from '@/feedback/haptics';
import { CompletionCard,CompletionError } from './completion-ui';
export function LedgerPanel({establishmentId}:{establishmentId:string}){
 const [kind,setKind]=useState<LedgerKind>('credits');
 const list=useInfiniteQuery({queryKey:['merchant','ledger',establishmentId,kind],initialPageParam:0,
 queryFn:({pageParam})=>fetchLedger(kind,establishmentId,pageParam),getNextPageParam:last=>last.nextOffset??undefined});
 return <CompletionCard>
  <AppText variant="subtitle">{t('ledger.title')}</AppText>
  <AppText variant="muted">{t('ledger.hint')}</AppText>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:tokens.spacing.sm}}>
   {(['credits','debts'] as const).map(value=><Button key={value} label={t(`finance.${value}`)} variant={kind===value?'primary':'outline'} onPress={()=>setKind(value)}/>)}
  </View>
  {list.isPending?<AppText>{t('common.loading')}</AppText>:null}
  <CompletionError error={list.error}/>
  <Button variant="ghost" label={t('ledger.refresh')} onPress={()=>void list.refetch()}/>
  {list.data?.pages.flatMap(p=>p.items).map(item=><LedgerCard key={kind+item.id} item={item} kind={kind}/>)}
  {list.isSuccess&&!list.data.pages[0]?.items.length?<AppText>{t('ledger.empty')}</AppText>:null}
  {list.hasNextPage?<Button label={t('ledger.more')} loading={list.isFetchingNextPage} onPress={()=>void list.fetchNextPage()}/>:null}
 </CompletionCard>;
}
function LedgerCard({item,kind}:{item:LedgerEntry;kind:LedgerKind}){
 const client=useQueryClient();
 const [open,setOpen]=useState(false),[amount,setAmount]=useState(''),[reference,setReference]=useState(''),[confirm,setConfirm]=useState(false);
 const request=useRef({payload:'',key:''});
 const history=useQuery({queryKey:['merchant','settlements',kind,item.id],queryFn:()=>fetchSettlements(kind,item.id),enabled:open});
 const save=useMutation({mutationFn:()=>{
  const payload=JSON.stringify([kind,item.id,amount,reference.trim()]);
  if(request.current.payload!==payload)request.current={payload,key:createIdempotencyKey()};
  return settleLedger(kind,item.id,amount,reference.trim(),request.current.key);
 },onSuccess:()=>{
  request.current={payload:'',key:''};setAmount('');setReference('');setConfirm(false);hapticSuccess();
  void client.invalidateQueries({queryKey:['merchant','ledger']});void client.invalidateQueries({queryKey:['merchant','settlements']});
 }});
 const valid=/^[1-9][0-9]{0,14}$/.test(amount)&&BigInt(amount)<=BigInt(item.remaining.amount)&&reference.trim().length>=2;
 return <CompletionCard>
  <AppText variant="subtitle">{item.name}</AppText>
  <AppText>{t('ledger.remaining',{amount:item.remaining.formatted})}</AppText>
  <AppText variant="caption">{t('ledger.paid',{paid:item.paid.formatted,total:item.amount.formatted})}</AppText>
  {item.settled?<AppText color={tokens.color.brand.primary}>{t('ledger.settled')}</AppText>:null}
  <Button label={open?t('ledger.close'):t('ledger.manage')} variant="outline" onPress={()=>setOpen(!open)}/>
  {open?<>
   {!item.settled?<>
    <TextField label={t('finance.amount')} value={amount} keyboardType="number-pad" onChangeText={v=>{setAmount(v);setConfirm(false);}}/>
    <TextField label={t('ledger.reference')} value={reference} maxLength={160} onChangeText={v=>{setReference(v);setConfirm(false);}}/>
    {!confirm?<Button label={t('ledger.record')} disabled={!valid} onPress={()=>setConfirm(true)}/>:<>
     <AppText>{t('ledger.confirm',{amount})}</AppText>
     <Button label={t('ledger.confirmAction')} loading={save.isPending} disabled={!valid} onPress={()=>save.mutate()}/>
     <Button label={t('common.cancel')} variant="ghost" disabled={save.isPending} onPress={()=>setConfirm(false)}/>
    </>}
   </>:null}
   <CompletionError error={save.error}/>{save.isSuccess?<AppText>{t('ledger.saved')}</AppText>:null}
   <AppText variant="subtitle">{t('ledger.history')}</AppText>
   {history.isPending?<AppText>{t('common.loading')}</AppText>:null}<CompletionError error={history.error}/>
   {history.data?.map(row=><View key={row.id}><AppText>{row.amount.formatted} · {row.reference}</AppText><AppText variant="caption">{new Date(row.createdAt).toLocaleDateString('fr-FR')}</AppText></View>)}
   {history.isSuccess&&!history.data.length?<AppText>{t('ledger.noHistory')}</AppText>:null}
  </>:null}
 </CompletionCard>;
}
