import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
/** Render conversation formatting without executing HTML from a transcript. */
export function MessageContent({text}:{text:string}){
 return <div className="bb-message-content"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
  table:({children})=><div className="bb-message-table"><table>{children}</table></div>,
  a:({children,href})=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
 }}>{text}</Markdown></div>;
}
