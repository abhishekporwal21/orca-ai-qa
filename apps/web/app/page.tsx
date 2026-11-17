'use client';
import { useEffect, useState } from 'react';
import { Bot, Plus, Search, Paperclip, Send, Sparkles, PanelLeftClose, MessageSquare, Settings, ChevronDown, Menu, FileText, Code2, Globe, Workflow, Loader2 } from 'lucide-react';

type Message = { id?: string; role: 'user' | 'assistant'; content: string };
type Conversation = { id: string; title: string; model: string; updatedAt: string };
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('Qwen/Qwen3-8B');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sidebar, setSidebar] = useState(true);

  async function loadConversations() {
    try { const r = await fetch(`${API}/api/chat/conversations`, { headers: { 'x-qa-user': 'qa-demo-user' } }); if (r.ok) setConversations(await r.json()); } catch { setError('Cannot reach API. Check that the backend is running.'); }
  }
  useEffect(() => { loadConversations(); }, []);
  async function openConversation(id: string) {
    setActiveId(id); setError('');
    try { const r = await fetch(`${API}/api/chat/conversations/${id}`, { headers: { 'x-qa-user': 'qa-demo-user' } }); if (!r.ok) throw new Error('Unable to load conversation'); const data = await r.json(); setMessages(data.messages.map((m: any) => ({ id: m.id, role: m.role, content: m.content }))); setModel(data.model); }
    catch (e: any) { setError(e.message); }
  }
  function newChat() { setActiveId(null); setMessages([]); setPrompt(''); setError(''); }
  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault(); const text = prompt.trim(); if (!text || busy) return;
    setPrompt(''); setError(''); setMessages(prev => [...prev, { role: 'user', content: text }]); setBusy(true);
    try {
      const r = await fetch(`${API}/api/chat/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-qa-user': 'qa-demo-user' }, body: JSON.stringify({ message: text, conversationId: activeId || undefined, model }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.message || 'Request failed');
      setActiveId(data.conversationId); setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]); await loadConversations();
    } catch (e: any) { setError(e.message || 'Something went wrong'); setMessages(prev => [...prev, { role: 'assistant', content: 'I could not complete that request. Please check the API configuration and try again.' }]); }
    finally { setBusy(false); }
  }

  return <main className="flex h-screen overflow-hidden bg-white">
    {sidebar && <aside className="hidden w-[270px] shrink-0 flex-col border-r border-slate-200 bg-slate-50 p-3 md:flex">
      <div className="mb-7 flex items-center justify-between px-2 pt-2"><div className="flex items-center gap-2"><div className="rounded-xl bg-slate-900 p-2 text-white"><Bot size={20}/></div><div><div className="font-bold tracking-tight">ORCA AI</div><div className="text-[10px] uppercase tracking-[.2em] text-slate-500">Intelligence workspace</div></div></div><button onClick={() => setSidebar(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"><PanelLeftClose size={17}/></button></div>
      <button onClick={newChat} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold shadow-sm hover:bg-slate-100"><Plus size={17}/> New chat <span className="ml-auto text-xs text-slate-400">⌘ K</span></button>
      <div className="mt-6 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><MessageSquare size={14}/> Recent conversations</div>
      <div className="mt-2 flex-1 space-y-1 overflow-y-auto">{conversations.map(c => <button key={c.id} onClick={() => openConversation(c.id)} className={`w-full truncate rounded-lg px-3 py-2.5 text-left text-sm ${activeId === c.id ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'}`}>{c.title}</button>)}{!conversations.length && <p className="px-3 py-3 text-xs text-slate-400">Your conversations will appear here.</p>}</div>
      <div className="border-t border-slate-200 pt-3"><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><Settings size={16}/> Settings <span className="ml-auto text-xs text-slate-400">Coming soon</span></button><div className="mt-2 flex items-center gap-2 rounded-xl bg-white p-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">QA</div><div><div className="text-xs font-semibold">QA Workspace</div><div className="text-[10px] text-slate-400">Development environment</div></div></div></div>
    </aside>}
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 px-4 md:px-6"><div className="flex items-center gap-3">{!sidebar && <button onClick={() => setSidebar(true)} className="rounded-lg p-2 hover:bg-slate-100"><Menu size={18}/></button>}<span className="text-sm font-semibold">{activeId ? 'Conversation' : 'New conversation'}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">QA</span></div><div className="flex items-center gap-2"><span className="hidden text-xs text-slate-400 sm:inline">Model</span><select value={model} onChange={e => setModel(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none"><option value="Qwen/Qwen3-8B">ORCA Qwen3 8B · Self-hosted</option></select><ChevronDown size={14} className="-ml-7 pointer-events-none text-slate-400"/></div></header>
      <div className="flex-1 overflow-y-auto"><div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pb-8 pt-8 md:px-8">
        {messages.length === 0 ? <div className="my-auto pb-20"><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200"><Sparkles size={26}/></div><h1 className="text-center text-3xl font-semibold tracking-tight text-slate-900">What can I help you with?</h1><p className="mt-3 text-center text-sm text-slate-500">Ask questions, explore ideas, or get work done with ORCA AI.</p><div className="mt-10 grid gap-3 sm:grid-cols-2">{[{icon:FileText,title:'Understand documents',desc:'Summarize and extract key information'},{icon:Code2,title:'Write and debug code',desc:'Build, explain, and improve software'},{icon:Globe,title:'Explore a topic',desc:'Break down complex questions'},{icon:Workflow,title:'Plan a workflow',desc:'Turn repetitive work into steps'}].map(x => <button key={x.title} onClick={() => setPrompt(x.title + ': ')} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-400 hover:bg-slate-50"><x.icon size={18} className="mb-3 text-slate-500"/><div className="text-sm font-semibold">{x.title}</div><div className="mt-1 text-xs text-slate-500">{x.desc}</div></button>)}</div></div> : <div className="space-y-7">{messages.map((m,i) => <div key={m.id || i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>{m.role === 'assistant' && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Bot size={17}/></div>}<div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 ${m.role === 'user' ? 'bg-slate-100 text-slate-900' : 'text-slate-800'}`}>{m.content}</div></div>)}{busy && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin"/> ORCA AI is thinking...</div>}</div>}
        {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      </div></div>
      <div className="shrink-0 px-4 pb-5 md:px-8"><form onSubmit={sendMessage} className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_35px_rgba(15,23,42,.07)] focus-within:border-slate-400"><textarea value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Message ORCA AI..." rows={2} className="max-h-40 min-h-[54px] w-full resize-y border-0 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-400"/><div className="flex items-center justify-between px-1"><div className="flex items-center gap-2 text-xs text-slate-400"><button type="button" title="File uploads coming in next phase" className="rounded-lg p-2 hover:bg-slate-100"><Paperclip size={16}/></button><span>AI can make mistakes. Verify important information.</span></div><button disabled={!prompt.trim() || busy} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"><Send size={16}/></button></div></form><p className="mt-2 text-center text-[10px] text-slate-400">ORCA AI · QA build 0.1.0</p></div>
    </section>
  </main>;
}
