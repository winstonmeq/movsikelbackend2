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
  const [tab, setTab] = useState<'overview' | 'users' | 'rides' | 'livemap'>('overview');

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
            { label: 'Live Map', value: 'livemap' }
          ]}
        />
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'users' && <Users />}
      {tab === 'rides' && <Rides />}
      {tab === 'livemap' && <LiveMap />}
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
          // Default center: Davao region (pilot area). Map recenters on first data.
          const map = L.map('admin-live-map').setView([7.19, 125.45], 12);
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
