import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTags, listAiSuggestions, createTag, updateTag } from '../../../api/tags';
import type { Tag, AiTagSuggestion } from '../../../api/tags';
import { AiSuggestionBanner } from '../../components/AiSuggestionBanner';
import { VENDOR_ID } from '../../../env';
import './TagsScreen.css';

export function TagsScreen() {
  const navigate = useNavigate();
  const vendorId = VENDOR_ID;

  const [tags, setTags] = useState<Tag[]>([]);
  const [suggestions, setSuggestions] = useState<AiTagSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    return Promise.all([listTags(vendorId), listAiSuggestions(vendorId)])
      .then(([t, s]) => {
        setTags(t);
        setSuggestions(s);
      })
      .finally(() => setLoading(false));
  }, [vendorId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const featuredTags = tags.filter((t) => t.featured);
  const allTags = tags.filter((t) => !t.featured);

  async function handleAcceptSuggestion(suggestion: AiTagSuggestion) {
    await createTag({ vendor_id: vendorId, name: suggestion.name, featured: true });
    // Drop suggestion locally, then reload full list
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    await reload();
  }

  function handleDismissSuggestion(suggestionId: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  }

  async function handleDemote(tag: Tag) {
    await updateTag(tag.id, { featured: false });
    await reload();
  }

  async function handlePromote(tag: Tag) {
    await updateTag(tag.id, { featured: true });
    await reload();
  }

  return (
    <div className="tags-screen">
      {/* Header */}
      <div className="tags-screen__header">
        <button
          type="button"
          className="tags-screen__back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ‹
        </button>
        <div className="tags-screen__header-text">
          <h1>Tag manager</h1>
          <div className="tags-screen__subtitle">
            Featured tags surface in customer browse · AI suggestions · promote / demote
          </div>
        </div>
        <button type="button" className="tags-screen__bulk-btn">
          ⚙ Bulk apply
        </button>
      </div>

      <div className="tags-screen__shell">
        {/* AI suggestion banners */}
        {suggestions.map((s) => (
          <AiSuggestionBanner
            key={s.id}
            title={`Add "${s.name}" as a featured tag?`}
            body={s.rationale}
            acceptLabel="+ Add tag"
            dismissLabel="Not now"
            onAccept={() => handleAcceptSuggestion(s)}
            onDismiss={() => handleDismissSuggestion(s.id)}
          />
        ))}

        {/* Featured tags section */}
        <div className="tags-screen__section">
          <div className="tags-screen__section-head tags-screen__section-head--featured">
            <div className="tags-screen__section-ic">★</div>
            <div className="tags-screen__section-info">
              <h2>Featured tags</h2>
              <div className="tags-screen__section-meta">
                Top of customer browse · gold-treated · used as quick filters
              </div>
            </div>
            <div className="tags-screen__count">
              <strong>{featuredTags.length}</strong>{' '}
              <span>featured · max 8</span>
            </div>
          </div>

          {loading ? (
            <div className="tags-screen__loading">Loading…</div>
          ) : (
            <div className="tags-screen__tag-list">
              {featuredTags.map((tag) => (
                <div key={tag.id} className="tags-screen__tag-row tags-screen__tag-row--featured">
                  <span className="tags-screen__chip tags-screen__chip--gold">
                    <span className="tags-screen__star">★</span> {tag.name}
                  </span>
                  {tag.product_count !== undefined && (
                    <div className="tags-screen__tag-meta">
                      <span className="tags-screen__stat">
                        <span className="tags-screen__val">{tag.product_count}</span> products
                      </span>
                    </div>
                  )}
                  <div className="tags-screen__tag-actions">
                    <button
                      type="button"
                      className="tags-screen__btn-demote"
                      aria-label={`Demote ${tag.name}`}
                      onClick={() => handleDemote(tag)}
                    >
                      Demote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All tags section */}
        <div className="tags-screen__section">
          <div className="tags-screen__section-head tags-screen__section-head--all">
            <div className="tags-screen__section-ic tags-screen__section-ic--plain">🏷</div>
            <div className="tags-screen__section-info">
              <h2>All tags</h2>
              <div className="tags-screen__section-meta">
                Internal · used as filters in spotlight and saved reports
              </div>
            </div>
            <div className="tags-screen__count">
              <strong>{allTags.length}</strong> <span>tags</span>
            </div>
          </div>

          {loading ? (
            <div className="tags-screen__loading">Loading…</div>
          ) : (
            <div className="tags-screen__tag-list">
              {allTags.map((tag) => (
                <div key={tag.id} className="tags-screen__tag-row">
                  <span className="tags-screen__chip">
                    {tag.name}
                  </span>
                  {tag.product_count !== undefined && (
                    <div className="tags-screen__tag-meta">
                      <span className="tags-screen__stat">
                        <span className="tags-screen__val">{tag.product_count}</span> products
                      </span>
                    </div>
                  )}
                  <div className="tags-screen__tag-actions">
                    <button
                      type="button"
                      className="tags-screen__btn-promote"
                      aria-label={`Promote ${tag.name}`}
                      onClick={() => handlePromote(tag)}
                    >
                      ★ Promote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
