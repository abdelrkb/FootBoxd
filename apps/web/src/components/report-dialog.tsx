'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ReportTargetType, ReportReason } from '@football-app/shared-types';
import * as api from '../lib/api';
import { Button } from './ui/button';

// Modération minimale (décision produit du 2026-10-02) : le signalement est juste enregistré,
// pas de file de traitement ni d'interface admin pour le MVP — voir architecture.md.
export function ReportDialog({
  targetType,
  targetId,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}) {
  const t = useTranslations('ReportDialog');
  const REASON_LABELS: Record<ReportReason, string> = {
    spam: t('reasonSpam'),
    harassment: t('reasonHarassment'),
    inappropriate_content: t('reasonInappropriate'),
    fake_account: t('reasonFakeAccount'),
    other: t('reasonOther'),
  };
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await api.createReport({ targetType, targetId, reason, details: details || undefined });
      setSent(true);
      setTimeout(onClose, 1200);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--fb-surface-2)',
          border: '1px solid var(--fb-border)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {sent ? (
          <p style={{ margin: 0, fontSize: 15 }}>{t('sent')}</p>
        ) : (
          <>
            <h2 className="fb-card-title" style={{ margin: 0, fontSize: 18 }}>
              {t('title')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <label className="fb-label" style={{ fontSize: 11.5, color: 'var(--fb-text-2)' }}>
                {t('reason')}
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                style={{
                  height: 46,
                  padding: '0 14px',
                  border: '1px solid var(--fb-border)',
                  borderRadius: 12,
                  background: 'var(--fb-bg)',
                  color: 'var(--fb-text)',
                  fontFamily: 'var(--fb-font-sans)',
                  fontSize: 15,
                }}
              >
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t('detailsPlaceholder')}
              maxLength={500}
              style={{
                width: '100%',
                minHeight: 80,
                boxSizing: 'border-box',
                padding: 14,
                border: '1px solid var(--fb-border)',
                borderRadius: 12,
                background: 'var(--fb-bg)',
                color: 'var(--fb-text)',
                fontFamily: 'var(--fb-font-sans)',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="tertiary" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button variant="destructive" loading={submitting} onClick={submit}>
                {t('title')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
