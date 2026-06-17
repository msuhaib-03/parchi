import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const company   = searchParams.get('company')  ?? 'A Company';
  const role      = searchParams.get('role')      ?? 'Engineer';
  const name      = searchParams.get('name')      ?? 'A MAJUite';
  const dept      = searchParams.get('dept')      ?? '';
  const batch     = searchParams.get('batch')     ?? '';
  const refName   = searchParams.get('ref')       ?? '';
  const isAnon    = searchParams.get('anon')      === '1';

  const displayName = isAnon ? `A ${dept || 'MAJU'} Student` : name;
  const batchShort  = batch ? `'${String(batch).slice(-2)}` : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Orb top-right */}
        <div style={{
          position: 'absolute', top: '-120px', right: '-120px',
          width: '420px', height: '420px', borderRadius: '50%',
          background: 'rgba(99,102,241,0.25)', display: 'flex',
        }} />
        {/* Orb bottom-left */}
        <div style={{
          position: 'absolute', bottom: '-160px', left: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'rgba(139,92,246,0.18)', display: 'flex',
        }} />
        {/* Subtle grid lines */}
        <div style={{
          position: 'absolute', inset: '0',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          display: 'flex',
        }} />

        {/* Green check badge */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          background: 'rgba(52,211,153,0.15)',
          border: '2px solid rgba(52,211,153,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '28px',
        }}>
          <div style={{ color: '#34d399', fontSize: '36px', fontWeight: 700, display: 'flex' }}>✓</div>
        </div>

        {/* "Got placed at" label */}
        <div style={{
          color: 'rgba(196,181,253,0.75)',
          fontSize: '18px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          marginBottom: '14px',
          display: 'flex',
        }}>
          Got placed at
        </div>

        {/* Company — hero text */}
        <div style={{
          color: '#ffffff',
          fontSize: company.length > 20 ? '52px' : '68px',
          fontWeight: 800,
          letterSpacing: '-1px',
          textAlign: 'center',
          marginBottom: '14px',
          maxWidth: '960px',
          lineHeight: 1.1,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {company}
        </div>

        {/* Role */}
        <div style={{
          color: 'rgba(199,210,254,0.85)',
          fontSize: '26px',
          fontWeight: 400,
          marginBottom: '40px',
          display: 'flex',
        }}>
          as&nbsp;<span style={{ fontWeight: 600, color: '#c7d2fe' }}>{role}</span>
        </div>

        {/* Thin divider */}
        <div style={{
          width: '56px', height: '2px',
          background: 'rgba(99,102,241,0.5)',
          marginBottom: '32px', display: 'flex',
        }} />

        {/* Name */}
        <div style={{
          color: 'rgba(224,231,255,0.95)',
          fontSize: '24px', fontWeight: 700,
          marginBottom: '8px', display: 'flex',
        }}>
          {displayName}
        </div>

        {/* Dept + batch */}
        {(dept || batchShort) && (
          <div style={{
            color: 'rgba(165,180,252,0.65)',
            fontSize: '17px',
            marginBottom: refName ? '10px' : '0',
            display: 'flex',
          }}>
            {dept}{dept && batchShort ? ' · ' : ''}MAJU {batchShort}
          </div>
        )}

        {/* Referred by */}
        {refName && (
          <div style={{
            color: 'rgba(110,231,183,0.75)',
            fontSize: '16px',
            display: 'flex',
          }}>
            Referred by {refName}
          </div>
        )}

        {/* Bottom branding */}
        <div style={{
          position: 'absolute', bottom: '28px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          {/* Parchi pill */}
          <div style={{
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: '999px',
            padding: '6px 18px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <div style={{
              fontSize: '16px', fontWeight: 800,
              color: '#a5b4fc', letterSpacing: '-0.5px', display: 'flex',
            }}>
              Parchi<span style={{ color: 'rgba(165,180,252,0.4)', fontWeight: 400 }}>.maju</span>
            </div>
            <div style={{ width: '1px', height: '14px', background: 'rgba(99,102,241,0.4)', display: 'flex' }} />
            <div style={{ color: 'rgba(148,163,184,0.6)', fontSize: '14px', display: 'flex' }}>
              MAJU Alumni Network
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
