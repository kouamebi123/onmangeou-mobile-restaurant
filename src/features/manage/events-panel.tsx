import { useInfiniteQuery,useMutation,useQueryClient } from '@tanstack/react-query';
import { useRef,useState } from 'react';
import { ScrollView,View } from 'react-native';
import { createIdempotencyKey } from '@/api/device';
import { cancelEvent,fetchManagedEvents,saveEvent,type RestaurantEvent } from '@/api/completion';
import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { t } from '@/i18n';
import { tokens } from '@/theme';
import { hapticSuccess } from '@/feedback/haptics';
import { CompletionCard,CompletionError } from './completion-ui';
import { reservationInstant,wallDate } from './event-time';
export function EventsPanel({establishmentId}:{establishmentId:string}){
 const client=useQueryClient(),[editor,setEditor]=useState<RestaurantEvent|'new'|null>(null),[cancelId,setCancelId]=useState<string|null>(null);
 const events=useInfiniteQuery({queryKey:['merchant','managed-events',establishmentId],initialPageParam:0,
 queryFn:({pageParam})=>fetchManagedEvents(establishmentId,pageParam),getNextPageParam:p=>p.nextOffset??undefined});
 const zone=events.data?.pages[0]?.timezone;
 const refresh=()=>{void client.invalidateQueries({queryKey:['merchant','managed-events']});};
 const cancel=useMutation({mutationFn:(id:string)=>cancelEvent(id),onSuccess:()=>{setCancelId(null);refresh();hapticSuccess();}});
 return <View style={{gap:tokens.spacing.sm}}>
  <AppText variant="subtitle">{t('eventManager.title')}</AppText>
  <AppText variant="muted">{t('eventManager.hint')}</AppText>
  <Button label={t('eventManager.new')} disabled={!zone} onPress={()=>setEditor('new')}/>
  {events.isPending?<AppText>{t('common.loading')}</AppText>:null}
  <CompletionError error={events.error}/><CompletionError error={cancel.error}/>
  <Button label={t('ledger.refresh')} variant="ghost" onPress={()=>void events.refetch()}/>
  {editor&&zone?<EventEditor key={editor==='new'?'new':editor.id} establishmentId={establishmentId} zone={zone}
   event={editor==='new'?undefined:editor} close={()=>setEditor(null)} done={()=>{setEditor(null);refresh();}}/>:null}
  {events.data?.pages.flatMap(p=>p.items).map(event=><CompletionCard key={event.id}>
   <AppText variant="subtitle">{event.title}</AppText>
   <AppText>{new Intl.DateTimeFormat('fr-FR',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(event.starts_at))}</AppText>
   {event.body?<AppText variant="muted">{event.body}</AppText>:null}
   {event.cancelled_at?<AppText>{t('eventManager.cancelled')}</AppText>:<>
    {new Date(event.starts_at).getTime()>Date.now()?<Button label={t('eventManager.edit')} variant="outline" onPress={()=>setEditor(event)}/>:null}
    {(new Date(event.ends_at??event.starts_at).getTime()>Date.now())?<Button label={t('eventManager.cancel')} variant="ghost" onPress={()=>setCancelId(event.id)}/>:null}
   </>}
   {cancelId===event.id?<><AppText>{t('eventManager.confirmCancel')}</AppText>
    <Button label={t('eventManager.cancel')} variant="destructive" loading={cancel.isPending} onPress={()=>cancel.mutate(event.id)}/>
    <Button label={t('common.cancel')} variant="ghost" disabled={cancel.isPending} onPress={()=>setCancelId(null)}/></>:null}
  </CompletionCard>)}
  {events.isSuccess&&!events.data.pages[0]?.items.length?<AppText>{t('eventManager.empty')}</AppText>:null}
  {events.hasNextPage?<Button label={t('ledger.more')} loading={events.isFetchingNextPage} onPress={()=>void events.fetchNextPage()}/>:null}
 </View>;
}
function EventEditor({establishmentId,zone,event,close,done}:{establishmentId:string;zone:string;event?:RestaurantEvent;close:()=>void;done:()=>void}){
 const initial=event?new Date(event.starts_at):new Date(Date.now()+86400_000);
 const [title,setTitle]=useState(event?.title??''),[body,setBody]=useState(event?.body??'');
 const [day,setDay]=useState(wallDate(initial,zone));
 const [time,setTime]=useState(event?new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(initial):'18:00');
 const initialDuration=event?.ends_at?Math.round((Date.parse(event.ends_at)-initial.getTime())/60000):120;
 const [duration,setDuration]=useState(initialDuration);
 const [picker,setPicker]=useState(false);
 const request=useRef({payload:'',key:''});
 const start=reservationInstant(day,time,zone);
 const valid=title.trim().length>=3&&start!==null&&start.getTime()>Date.now();
 const save=useMutation({mutationFn:()=>{
  if(!start||!valid)throw new Error(t('eventManager.invalid'));
  const input={establishmentId,title:title.trim(),body:body.trim(),startsAt:start.toISOString(),endsAt:new Date(start.getTime()+duration*60000).toISOString()};
  const payload=JSON.stringify(input);
  if(request.current.payload!==payload)request.current={payload,key:createIdempotencyKey()};
  return saveEvent(input,request.current.key,event?.id);
 },onSuccess:()=>{hapticSuccess();done();}});
 const days=Array.from({length:31},(_,i)=>wallDate(new Date(Date.now()+i*86400_000),zone));
 const times=Array.from({length:96},(_,i)=>`${String(Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')}`);
 return <CompletionCard>
  <AppText variant="subtitle">{t(event?'eventManager.edit':'eventManager.new')}</AppText>
  <TextField label={t('service.eventTitle')} value={title} onChangeText={setTitle} maxLength={160}/>
  <TextField label={t('eventManager.description')} value={body} onChangeText={setBody} maxLength={1000} multiline/>
  <Button label={`${day} · ${time} (${zone})`} variant="outline" onPress={()=>setPicker(!picker)}/>
  {picker?<>
   <AppText variant="caption">{t('eventManager.day')}</AppText>
   <ScrollView horizontal contentContainerStyle={{gap:tokens.spacing.sm}}>{days.map(d=><Button key={d} label={d.slice(8)+'/'+d.slice(5,7)} variant={d===day?'primary':'outline'} onPress={()=>setDay(d)}/>)}</ScrollView>
   <AppText variant="caption">{t('eventManager.time')}</AppText>
   <ScrollView horizontal contentContainerStyle={{gap:tokens.spacing.sm}}>{times.map(hour=><Button key={hour} label={hour} variant={hour===time?'primary':'outline'} onPress={()=>setTime(hour)}/>)}</ScrollView>
  </>:null}
  <AppText>{t('eventManager.duration')}</AppText>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:tokens.spacing.sm}}>
   {[...new Set([60,120,180,240,initialDuration])].map(minutes=><Button key={minutes} label={t('eventManager.minutes',{value:String(minutes)})} variant={duration===minutes?'primary':'outline'} onPress={()=>setDuration(minutes)}/>)}
  </View>
  {!valid?<AppText variant="caption">{t('eventManager.invalid')}</AppText>:null}
  <CompletionError error={save.error}/>
  <Button label={t('eventManager.save')} disabled={!valid} loading={save.isPending} onPress={()=>save.mutate()}/>
  <Button label={t('common.cancel')} variant="ghost" disabled={save.isPending} onPress={close}/>
 </CompletionCard>;
}
