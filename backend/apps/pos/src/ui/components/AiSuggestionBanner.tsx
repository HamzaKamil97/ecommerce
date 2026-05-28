import { ReactNode } from 'react';
import './AiSuggestionBanner.css';

type Props = {
  title: string;
  body: ReactNode;
  acceptLabel?: string;
  dismissLabel?: string;
  onAccept: () => void;
  onDismiss: () => void;
};

export function AiSuggestionBanner({
  title,
  body,
  acceptLabel = '+ Apply',
  dismissLabel = 'Not now',
  onAccept,
  onDismiss,
}: Props) {
  return (
    <div className="ai-banner" role="region" aria-label="AI suggestion">
      <div className="ai-dot" aria-hidden>AI</div>
      <div className="ai-body">
        <h3>{title}</h3>
        <div className="ai-text">{body}</div>
      </div>
      <div className="ai-actions">
        <button type="button" className="ai-accept" onClick={onAccept}>{acceptLabel}</button>
        <button type="button" className="ai-dismiss" onClick={onDismiss}>{dismissLabel}</button>
      </div>
    </div>
  );
}
