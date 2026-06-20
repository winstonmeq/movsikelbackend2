'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch, clearToken, getToken } from './lib/adminClient';
import { Button, Card, Input, RoleTabs, StatusBadge, colors } from './lib/ui';

type User = {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  homeBarangay: string;
  homeAddress: string;
  vehicleType: string;
  plateNumber: string;
  tricycleNumber: string;
  online: boolean;
  createdAt: string;
};

type Stats = {
  passengers: number;
  drivers: number;
  onlineDrivers: number;
  suspended: number;
  banned: number;
  totalRides: number;
  completedRides: number;
  activeRides: number;
  sharedRideRequests: number;
  bookingRideRequests: number;
  estimatedRevenue: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'overview' | 'users' | 'rides' | 'livemap' | 'ads' | 'wallet' | 'ratings'>('overview');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/admin/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 18px 60px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 22
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>MovSikel Admin</h1>
          <p style={{ margin: '2px 0 0', color: colors.muted, fontSize: 14 }}>
            Manage passengers, drivers, and rides.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            clearToken();
            router.replace('/admin/login');
          }}
        >
          Sign out
        </Button>
      </header>

      <div style={{ marginBottom: 20 }}>
        <RoleTabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          options={[
            { label: 'Overview', value: 'overview' },
            { label: 'Users', value: 'users' },
            { label: 'Rides', value: 'rides' },
            { label: 'Live Map', value: 'livemap' },
            { label: 'Ads', value: 'ads' },
            { label: 'Wallet', value: 'wallet' },
            { label: 'Ratings', value: 'ratings' },
          ]}
        />
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'rides' && <Rides />}
      {tab === 'livemap' && <LiveMap />}
      {tab === 'ads' && <Ads />}
      {tab === 'wallet' && <Wallet />}
      {tab === 'ratings' && <Ratings />}
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<{ stats: Stats }>('/api/admin/overview')
      .then((d) => setStats(d.stats))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <Card style={{ color: colors.danger }}>{error}</Card>;
  if (!stats) return <Card>Loading…</Card>;

  const tiles = [
    { label: 'Passengers', value: stats.passengers },
    { label: 'Drivers', value: stats.drivers },
    { label: 'Drivers online', value: stats.onlineDrivers },
    { label: 'Active rides', value: stats.activeRides },
    { label: 'Completed rides', value: stats.completedRides },
    { label: 'Total rides', value: stats.totalRides },
    { label: 'Shared ride requests', value: stats.sharedRideRequests },
    { label: 'Booking ride requests', value: stats.bookingRideRequests },
    { label: 'Suspended', value: stats.suspended },
    { label: 'Banned', value: stats.banned },
    { label: 'Est. revenue (₱)', value: stats.estimatedRevenue.toLocaleString() }
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 12
      }}
    >
      {tiles.map((t) => (
        <Card key={t.label}>
          <div style={{ color: colors.muted, fontSize: 13 }}>{t.label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{t.value}</div>
        </Card>
      ))}
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (role !== 'all') params.set('role', role);
      if (status !== 'all') params.set('status', status);
      params.set('limit', '50');
      const data = await adminFetch<{ users: User[] }>(`/api/admin/users?${params.toString()}`);
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, role, status]);

  useEffect(() => {
    load();
  }, [role, status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Input
              placeholder="Search name or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <Button onClick={load}>Search</Button>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Role</div>
            <RoleTabs
              value={role}
              onChange={setRole}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Passengers', value: 'passenger' },
                { label: 'Drivers', value: 'driver' },
                { label: 'Admins', value: 'admin' }
              ]}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Status</div>
            <RoleTabs
              value={status}
              onChange={setStatus}
              options={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Suspended', value: 'suspended' },
                { label: 'Banned', value: 'banned' }
              ]}
            />
          </div>
        </div>
      </Card>

      {error && <Card style={{ color: colors.danger, marginBottom: 12 }}>{error}</Card>}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <Td>
                    {u.name}
                    {u.role === 'driver' && u.online && (
                      <span style={{ color: colors.ok, fontSize: 12, marginLeft: 6 }}>● online</span>
                    )}
                  </Td>
                  <Td>{u.phone}</Td>
                  <Td style={{ textTransform: 'capitalize' }}>{u.role}</Td>
                  <Td>
                    <StatusBadge status={u.status} />
                  </Td>
                  <Td>
                    <Button variant="ghost" onClick={() => setEditing(u)}>
                      Manage
                    </Button>
                  </Td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <Td colSpan={5} style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                    No users found.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <ManageUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ManageUserModal({
  user,
  onClose,
  onSaved
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [homeBarangay, setHomeBarangay] = useState(user.homeBarangay);
  const [plateNumber, setPlateNumber] = useState(user.plateNumber);
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function patch(payload: Record<string, unknown>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setError('');
    try {
      await adminFetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  async function saveProfile() {
    const payload: Record<string, unknown> = { name, phone, homeBarangay };
    if (user.role === 'driver') payload.plateNumber = plateNumber;
    if (newPassword.trim()) payload.newPassword = newPassword.trim();
    await patch(payload);
  }

  async function remove() {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try {
      await adminFetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%' }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 19 }}>Manage user</h2>
            <StatusBadge status={user.status} />
          </div>
          <p style={{ color: colors.muted, fontSize: 13, margin: '4px 0 16px', textTransform: 'capitalize' }}>
            {user.role}
          </p>

          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Home barangay">
            <Input value={homeBarangay} onChange={(e) => setHomeBarangay(e.target.value)} />
          </Field>
          {user.role === 'driver' && (
            <Field label="Plate number">
              <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
            </Field>
          )}
          <Field label="Reset password (leave blank to keep)">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
            />
          </Field>

          {error && <p style={{ color: colors.danger, fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <Button onClick={saveProfile} disabled={busy}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
          </div>

          <hr style={{ border: 0, borderTop: `1px solid ${colors.border}`, margin: '18px 0' }} />
          <div style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>Account status</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {user.status !== 'active' && (
              <Button variant="ghost" onClick={() => patch({ status: 'active' })} disabled={busy}>
                Reactivate
              </Button>
            )}
            {user.status !== 'suspended' && (
              <Button
                variant="warn"
                onClick={() => patch({ status: 'suspended' }, `Suspend ${user.name}?`)}
                disabled={busy}
              >
                Suspend
              </Button>
            )}
            {user.status !== 'banned' && (
              <Button
                variant="danger"
                onClick={() => patch({ status: 'banned' }, `Ban ${user.name}?`)}
                disabled={busy}
              >
                Ban
              </Button>
            )}
            <Button variant="danger" onClick={remove} disabled={busy}>
              Delete
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Rides() {
  const [rides, setRides] = useState<any[]>([]);
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    params.set('limit', '50');
    adminFetch<{ rides: any[] }>(`/api/admin/rides?${params.toString()}`)
      .then((d) => setRides(d.rides))
      .catch((e) => setError(e.message));
  }, [status]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <RoleTabs
          value={status}
          onChange={setStatus}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Requested', value: 'requested' },
            { label: 'Accepted', value: 'accepted' },
            { label: 'In progress', value: 'in_progress' },
            { label: 'Completed', value: 'completed' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'No drivers', value: 'no_drivers' }
          ]}
        />
      </div>

      {error && <Card style={{ color: colors.danger, marginBottom: 12 }}>{error}</Card>}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <Th>When</Th>
                <Th>Passenger</Th>
                <Th>Driver</Th>
                <Th>Type</Th>
                <Th>Fare (₱)</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rides.map((r) => (
                <tr key={r._id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                  <Td>{r.passengerId?.name || '—'}</Td>
                  <Td>{r.driverId?.name || '—'}</Td>
                  <Td style={{ textTransform: 'capitalize' }}>{r.rideType}</Td>
                  <Td>{r.offeredFare ?? r.fareEstimate ?? '—'}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                </tr>
              ))}
              {rides.length === 0 && (
                <tr>
                  <Td colSpan={6} style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                    No rides found.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function LiveMap() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<Record<string, any>>({});
  const leafletRef = React.useRef<any>(null);

  // Load Leaflet from CDN once (no npm dependency added to the backend).
  useEffect(() => {
    let cancelled = false;

    function ensureLeaflet(): Promise<any> {
      return new Promise((resolve, reject) => {
        const w = window as any;
        if (w.L) return resolve(w.L);
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve((window as any).L);
        script.onerror = () => reject(new Error('Could not load map library.'));
        document.head.appendChild(script);
      });
    }

    ensureLeaflet()
      .then((L) => {
        if (cancelled) return;
        leafletRef.current = L;
        if (!mapRef.current) {
          // Default center: Kidapawan City (pilot area). Map recenters on first data.
          const map = L.map('admin-live-map').setView([7.022705, 125.087725], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap',
            maxZoom: 19
          }).addTo(map);
          mapRef.current = map;
        }
        load();
      })
      .catch((e) => setError(e.message));

    const timer = setInterval(() => {
      if (leafletRef.current && mapRef.current) load();
    }, 10000); // poll every 10s while the map tab is open

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const data = await adminFetch<{ drivers: any[] }>('/api/admin/drivers/live');
      setDrivers(data.drivers);
      setUpdatedAt(new Date());
      setError('');
      renderMarkers(data.drivers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load drivers');
    }
  }

  function renderMarkers(list: any[]) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const seen = new Set<string>();
    list.forEach((d) => {
      seen.add(d.id);
      const label = `${d.name}${d.plateNumber ? ' • ' + d.plateNumber : ''}`;
      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLatLng([d.lat, d.lng]).setPopupContent(label);
      } else {
        markersRef.current[d.id] = L.marker([d.lat, d.lng]).addTo(map).bindPopup(label);
      }
    });
    // Remove markers for drivers no longer online.
    Object.keys(markersRef.current).forEach((id) => {
      if (!seen.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }

  return (
    <div>
      <Card style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong>{drivers.length}</strong> driver{drivers.length === 1 ? '' : 's'} online
          {updatedAt && (
            <span style={{ color: colors.muted, fontSize: 13, marginLeft: 8 }}>
              · updated {updatedAt.toLocaleTimeString()}
            </span>
          )}
        </div>
        <span style={{ color: colors.muted, fontSize: 12 }}>Auto-refreshes every 10s</span>
      </Card>
      {error && <Card style={{ color: colors.danger, marginBottom: 12 }}>{error}</Card>}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div id="admin-live-map" style={{ height: 520, width: '100%' }} />
      </Card>
    </div>
  );
}

type Ad = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  order: number;
  createdAt: string;
};

function Ads() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Ad | 'new' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<{ ads: Ad[] }>('/api/admin/ads');
      setAds(data.ads);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(ad: Ad) {
    try {
      await adminFetch(`/api/admin/ads/${ad.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !ad.active })
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  async function remove(ad: Ad) {
    if (!window.confirm(`Delete "${ad.title}"? This cannot be undone.`)) return;
    try {
      await adminFetch(`/api/admin/ads/${ad.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  return (
    <div>
      <Card style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <strong>“Check this out” promos</strong>
          <p style={{ margin: '2px 0 0', color: colors.muted, fontSize: 13 }}>
            Shown in the passenger app dashboard. Tapping an active promo opens its link.
          </p>
        </div>
        <Button onClick={() => setEditing('new')}>+ New ad</Button>
      </Card>

      {error && <Card style={{ color: colors.danger, marginBottom: 12 }}>{error}</Card>}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <Th>Image</Th>
                <Th>Title</Th>
                <Th>Link</Th>
                <Th>Order</Th>
                <Th>Active</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <Td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ad.imageUrl}
                      alt={ad.title}
                      style={{ width: 72, height: 44, objectFit: 'cover', borderRadius: 6, background: colors.bg }}
                    />
                  </Td>
                  <Td>{ad.title}</Td>
                  <Td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={ad.linkUrl} target="_blank" rel="noreferrer" style={{ color: colors.primary }}>
                      {ad.linkUrl}
                    </a>
                  </Td>
                  <Td>{ad.order}</Td>
                  <Td>
                    <button
                      onClick={() => toggleActive(ad)}
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        borderRadius: 999,
                        padding: '2px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: ad.active ? colors.ok : colors.muted,
                        background: `${ad.active ? colors.ok : colors.muted}1a`
                      }}
                    >
                      {ad.active ? 'Active' : 'Hidden'}
                    </button>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" onClick={() => setEditing(ad)}>Edit</Button>
                      <Button variant="danger" onClick={() => remove(ad)}>Delete</Button>
                    </div>
                  </Td>
                </tr>
              ))}
              {!loading && ads.length === 0 && (
                <tr>
                  <Td colSpan={6} style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                    No ads yet. Click “New ad” to add one.
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <AdModal
          ad={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AdModal({
  ad,
  onClose,
  onSaved
}: {
  ad: Ad | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(ad?.title ?? '');
  const [imageUrl, setImageUrl] = useState(ad?.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(ad?.linkUrl ?? '');
  const [order, setOrder] = useState(String(ad?.order ?? 0));
  const [active, setActive] = useState(ad?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim(),
        order: Number(order) || 0,
        active
      };
      if (ad) {
        await adminFetch(`/api/admin/ads/${ad.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await adminFetch('/api/admin/ads', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        zIndex: 50
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '100%' }}>
        <Card>
          <h2 style={{ margin: '0 0 16px', fontSize: 19 }}>{ad ? 'Edit ad' : 'New ad'}</h2>

          <Field label="Title / label">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Refer & ride" />
          </Field>
          <Field label="Image URL">
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/banner.jpg" />
          </Field>
          {imageUrl.trim() && (
            <div style={{ marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="preview"
                style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, background: colors.bg }}
              />
            </div>
          )}
          <Field label="Facebook page or website URL">
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://facebook.com/yourpage" />
          </Field>
          <Field label="Display order (lower shows first)">
            <Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 14 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (visible in the passenger app)
          </label>

          {error && <p style={{ color: colors.danger, fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Button onClick={save} disabled={busy}>{ad ? 'Save changes' : 'Create ad'}</Button>
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

type DriverWalletRow = {
  driverId: string;
  name: string;
  phone: string;
  balance: number;
  lifetimeDebits: number;
  lifetimeRewards: number;
  lifetimeTopUps: number;
  lifetimeReferralBonus: number;
};

type WalletSummary = {
  totalFeesCollected: number;
  totalRewardsPaid: number;
  totalTopUps: number;
  totalReferralBonus: number;
  netPlatformRevenue: number;
};

type WalletTx = {
  id: string;
  driver: { id: string; name: string; phone: string };
  type: string;
  direction: string;
  amount: number;
  balanceAfter: number;
  description: string;
  rideId: string | null;
  createdAt: string;
};

function peso(v: number) {
  return `₱${v.toFixed(2)}`;
}

function Wallet() {
  const [drivers, setDrivers] = useState<DriverWalletRow[]>([]);
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [txns, setTxns] = useState<WalletTx[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<DriverWalletRow | null>(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNote, setTopupNote] = useState('');
  const [topupDir, setTopupDir] = useState<'credit' | 'debit'>('credit');
  const [txDriver, setTxDriver] = useState('');
  const [txType, setTxType] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [txError, setTxError] = useState('');
  const [activeSection, setActiveSection] = useState<'balances' | 'ledger'>('balances');

  const loadDrivers = useCallback(async () => {
    setError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search.trim()) params.set('search', search.trim());
      const data = await adminFetch<{ drivers: DriverWalletRow[]; summary: WalletSummary }>(
        `/api/admin/wallet?${params}`
      );
      setDrivers(data.drivers);
      setSummary(data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [search]);

  const loadTxns = useCallback(async () => {
    setTxError('');
    try {
      const params = new URLSearchParams({ limit: '40' });
      if (txDriver.trim()) params.set('driverId', txDriver.trim());
      if (txType !== 'all') params.set('type', txType);
      const data = await adminFetch<{ transactions: WalletTx[] }>(
        `/api/admin/wallet/transactions?${params}`
      );
      setTxns(data.transactions);
    } catch (e) {
      setTxError(e instanceof Error ? e.message : 'Failed');
    }
  }, [txDriver, txType]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);
  useEffect(() => { if (activeSection === 'ledger') loadTxns(); }, [activeSection, loadTxns]);

  async function applyTopup() {
    if (!selectedDriver) return;
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) { setError('Enter a valid amount.'); return; }
    if (!topupNote.trim()) { setError('Enter a note.'); return; }
    setBusy(true);
    setError('');
    try {
      await adminFetch('/api/admin/wallet', {
        method: 'POST',
        body: JSON.stringify({ driverId: selectedDriver.driverId, amount, note: topupNote, direction: topupDir }),
      });
      setSelectedDriver(null);
      setTopupAmount('');
      setTopupNote('');
      loadDrivers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const balanceColor = (b: number) =>
    b <= 0 ? colors.danger : b < 10 ? colors.warn : colors.ok;

  const txColor = (dir: string) => dir === 'credit' ? colors.ok : colors.danger;

  return (
    <div>
      {/* Summary strip */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Fees collected', value: peso(summary.totalFeesCollected) },
            { label: 'Rewards paid', value: peso(summary.totalRewardsPaid) },
            { label: 'Referral bonus paid', value: peso(summary.totalReferralBonus) },
            { label: 'Total top-ups', value: peso(summary.totalTopUps) },
            { label: 'Net platform revenue', value: peso(summary.netPlatformRevenue) },
          ].map(t => (
            <Card key={t.label}>
              <div style={{ color: colors.muted, fontSize: 12 }}>{t.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4,
                color: t.label === 'Net platform revenue' ? colors.primary : undefined }}>{t.value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Section tabs */}
      <Card style={{ marginBottom: 16 }}>
        <RoleTabs
          value={activeSection}
          onChange={v => setActiveSection(v as typeof activeSection)}
          options={[
            { label: 'Driver balances', value: 'balances' },
            { label: 'Transaction ledger', value: 'ledger' },
          ]}
        />
      </Card>

      {error && <Card style={{ color: colors.danger, marginBottom: 12 }}>{error}</Card>}

      {activeSection === 'balances' && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Search driver by name or phone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadDrivers()}
                />
              </div>
              <Button onClick={loadDrivers}>Search</Button>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <Th>Driver</Th>
                    <Th>Balance</Th>
                    <Th>Lifetime fees</Th>
                    <Th>Rewards</Th>
                    <Th>Referral bonus</Th>
                    <Th>Top-ups</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => (
                    <tr key={d.driverId} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        <div style={{ color: colors.muted, fontSize: 12 }}>{d.phone}</div>
                      </Td>
                      <Td>
                        <span style={{ fontWeight: 700, color: balanceColor(d.balance) }}>
                          {peso(d.balance)}
                        </span>
                        {d.balance < 5 && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: colors.warn }}>⚠ Low</span>
                        )}
                      </Td>
                      <Td>{peso(d.lifetimeDebits)}</Td>
                      <Td>{peso(d.lifetimeRewards)}</Td>
                      <Td>{peso(d.lifetimeReferralBonus)}</Td>
                      <Td>{peso(d.lifetimeTopUps)}</Td>
                      <Td>
                        <Button variant="ghost" onClick={() => { setSelectedDriver(d); setError(''); }}>
                          Top up / Adjust
                        </Button>
                      </Td>
                    </tr>
                  ))}
                  {drivers.length === 0 && (
                    <tr>
                      <Td colSpan={7} style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                        No drivers found.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeSection === 'ledger' && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Driver ID (optional)</div>
                <Input placeholder="Paste driver ID to filter…" value={txDriver} onChange={e => setTxDriver(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Type</div>
                <RoleTabs value={txType} onChange={setTxType} options={[
                  { label: 'All', value: 'all' },
                  { label: 'Fee', value: 'fee' },
                  { label: 'Reward', value: 'reward' },
                  { label: 'Top-up', value: 'topup' },
                  { label: 'Referral', value: 'referral_bonus' },
                  { label: 'Adjustment', value: 'adjustment' },
                ]} />
              </div>
              <Button onClick={loadTxns}>Filter</Button>
            </div>
          </Card>
          {txError && <Card style={{ color: colors.danger, marginBottom: 12 }}>{txError}</Card>}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <Th>Date</Th>
                    <Th>Driver</Th>
                    <Th>Type</Th>
                    <Th>Amount</Th>
                    <Th>Balance after</Th>
                    <Th>Description</Th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map(t => (
                    <tr key={t.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <Td>{new Date(t.createdAt).toLocaleString()}</Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{t.driver.name}</div>
                        <div style={{ color: colors.muted, fontSize: 11 }}>{t.driver.phone}</div>
                      </Td>
                      <Td style={{ textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</Td>
                      <Td>
                        <span style={{ fontWeight: 700, color: txColor(t.direction) }}>
                          {t.direction === 'credit' ? '+' : '-'}{peso(t.amount)}
                        </span>
                      </Td>
                      <Td>{peso(t.balanceAfter)}</Td>
                      <Td style={{ maxWidth: 260 }}>{t.description}</Td>
                    </tr>
                  ))}
                  {txns.length === 0 && (
                    <tr>
                      <Td colSpan={6} style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                        No transactions found.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Top-up / Adjust modal */}
      {selectedDriver && (
        <div
          onClick={() => setSelectedDriver(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '100%' }}>
            <Card>
              <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Top up / Adjust wallet</h2>
              <p style={{ margin: '0 0 16px', color: colors.muted, fontSize: 13 }}>
                {selectedDriver.name} · {selectedDriver.phone}
              </p>
              <div style={{ fontSize: 13, marginBottom: 16 }}>
                Current balance:{' '}
                <strong style={{ color: balanceColor(selectedDriver.balance) }}>
                  {peso(selectedDriver.balance)}
                </strong>
              </div>
              <Field label="Direction">
                <RoleTabs value={topupDir} onChange={v => setTopupDir(v as 'credit' | 'debit')} options={[
                  { label: 'Credit (add funds)', value: 'credit' },
                  { label: 'Debit (deduct)', value: 'debit' },
                ]} />
              </Field>
              <Field label="Amount (₱)">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                />
              </Field>
              <Field label="Note (required)">
                <Input
                  placeholder="e.g. Manual top-up via GCash"
                  value={topupNote}
                  onChange={e => setTopupNote(e.target.value)}
                />
              </Field>
              {error && <p style={{ color: colors.danger, fontSize: 13 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <Button onClick={applyTopup} disabled={busy}
                  variant={topupDir === 'debit' ? 'warn' : 'primary'}>
                  {topupDir === 'credit' ? 'Add funds' : 'Deduct'}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedDriver(null)} disabled={busy}>Cancel</Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

type RatingRow = {
  id: string;
  driver: { id: string; name: string; phone: string; plateNumber: string };
  passenger: { id: string; name: string };
  rating: number;
  comment: string;
  ratedAt: string;
  fare: number;
  completedAt: string;
};

type DriverStat = {
  driverId: string;
  name: string;
  phone: string;
  averageRating: number;
  totalRatings: number;
  breakdown: Record<number, number>;
};

function Stars({ value }: { value: number }) {
  return (
    <span style={{ letterSpacing: 1, color: '#f59e0b', fontWeight: 700 }}>
      {'★'.repeat(value)}
      <span style={{ color: colors.border }}>{'★'.repeat(5 - value)}</span>
    </span>
  );
}

function Ratings() {
  const [section, setSection] = useState<'reviews' | 'drivers'>('drivers');
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [stats, setStats] = useState<DriverStat[]>([]);
  const [driverFilter, setDriverFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '30' });
      if (driverFilter.trim()) params.set('driverId', driverFilter.trim());
      const data = await adminFetch<{ rides: RatingRow[]; driverStats: DriverStat[]; pages: number; total: number }>(
        `/api/admin/ratings?${params}`
      );
      setRows(data.rides);
      setStats(data.driverStats);
      setPages(data.pages);
      setTotal(data.total);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [driverFilter]);

  useEffect(() => { load(); }, [load]);

  const avgAll = stats.length
    ? (stats.reduce((s, d) => s + d.averageRating * d.totalRatings, 0) /
       stats.reduce((s, d) => s + d.totalRatings, 0))
    : 0;

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total ratings', value: String(total) },
          { label: 'Drivers rated', value: String(stats.length) },
          { label: 'Overall avg rating', value: total ? `${avgAll.toFixed(1)} ★` : '—' },
        ].map(t => (
          <Card key={t.label}>
            <div style={{ color: colors.muted, fontSize: 12 }}>{t.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: colors.primary }}>{t.value}</div>
          </Card>
        ))}
      </div>

      {/* Section tabs */}
      <Card style={{ marginBottom: 16 }}>
        <RoleTabs
          value={section}
          onChange={v => setSection(v as typeof section)}
          options={[
            { label: 'Driver leaderboard', value: 'drivers' },
            { label: 'All reviews', value: 'reviews' },
          ]}
        />
      </Card>

      {error && <Card style={{ color: colors.danger, marginBottom: 12 }}>{error}</Card>}

      {section === 'drivers' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                  <Th>Driver</Th>
                  <Th>Avg rating</Th>
                  <Th>Total reviews</Th>
                  <Th>5★</Th>
                  <Th>4★</Th>
                  <Th>3★</Th>
                  <Th>2★</Th>
                  <Th>1★</Th>
                </tr>
              </thead>
              <tbody>
                {stats.map(d => (
                  <tr key={d.driverId} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <Td>
                      <div style={{ fontWeight: 600 }}>{d.name}</div>
                      <div style={{ color: colors.muted, fontSize: 12 }}>{d.phone}</div>
                    </Td>
                    <Td>
                      <span style={{ fontWeight: 800, fontSize: 16,
                        color: d.averageRating >= 4 ? colors.ok : d.averageRating >= 3 ? colors.warn : colors.danger }}>
                        {d.averageRating.toFixed(1)}
                      </span>
                      <span style={{ marginLeft: 4, color: '#f59e0b' }}>★</span>
                    </Td>
                    <Td>{d.totalRatings}</Td>
                    {[5, 4, 3, 2, 1].map(n => (
                      <Td key={n} style={{ color: colors.muted }}>{d.breakdown[n] ?? 0}</Td>
                    ))}
                  </tr>
                ))}
                {stats.length === 0 && !loading && (
                  <tr>
                    <Td colSpan={8} style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                      No ratings yet.
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {section === 'reviews' && (
        <>
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Filter by Driver ID…"
                  value={driverFilter}
                  onChange={e => setDriverFilter(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && load(1)}
                />
              </div>
              <Button onClick={() => load(1)}>Filter</Button>
            </div>
          </Card>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <Th>Date rated</Th>
                    <Th>Driver</Th>
                    <Th>Passenger</Th>
                    <Th>Stars</Th>
                    <Th>Comment</Th>
                    <Th>Fare</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <Td>{r.ratedAt ? new Date(r.ratedAt).toLocaleString() : '—'}</Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{r.driver.name}</div>
                        <div style={{ color: colors.muted, fontSize: 11 }}>{r.driver.phone}</div>
                      </Td>
                      <Td>{r.passenger.name}</Td>
                      <Td><Stars value={r.rating} /></Td>
                      <Td style={{ maxWidth: 260, color: r.comment ? undefined : colors.muted }}>
                        {r.comment || '—'}
                      </Td>
                      <Td>₱{(r.fare ?? 0).toFixed(0)}</Td>
                    </tr>
                  ))}
                  {rows.length === 0 && !loading && (
                    <tr>
                      <Td colSpan={6} style={{ color: colors.muted, textAlign: 'center', padding: 24 }}>
                        No reviews found.
                      </Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          {pages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
              <Button variant="ghost" onClick={() => load(page - 1)} disabled={page <= 1}>← Prev</Button>
              <span style={{ alignSelf: 'center', color: colors.muted, fontSize: 13 }}>Page {page} of {pages}</span>
              <Button variant="ghost" onClick={() => load(page + 1)} disabled={page >= pages}>Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '12px 14px', fontSize: 12, color: colors.muted, fontWeight: 700 }}>{children}</th>;
}

function Td({
  children,
  colSpan,
  style
}: {
  children: React.ReactNode;
  colSpan?: number;
  style?: React.CSSProperties;
}) {
  return (
    <td colSpan={colSpan} style={{ padding: '12px 14px', ...style }}>
      {children}
    </td>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
