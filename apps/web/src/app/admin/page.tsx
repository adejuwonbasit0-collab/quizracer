'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [features, setFeatures] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    const res = await apiGet('/admin/analytics/overview');
    setOverview(res.data);
  };

  const fetchUsers = async () => {
    const res = await apiGet('/admin/users');
    setUsers(res.data.users);
  };

  const fetchFeatures = async () => {
    const res = await apiGet('/admin/features');
    setFeatures(res.data);
  };

  const fetchFlags = async () => {
    const res = await apiGet('/admin/anti-cheat/flags');
    setFlags(res.data);
  };

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'overview') await fetchOverview();
    if (activeTab === 'users') await fetchUsers();
    if (activeTab === 'features') await fetchFeatures();
    if (activeTab === 'flags') await fetchFlags();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const toggleFeature = async (key, enabled) => {
    await apiPatch('/admin/features/' + key, { enabled: !enabled });
    fetchFeatures();
  };

  const banUser = async (id) => {
    await apiPatch('/admin/users/' + id + '/ban', { reason: 'Admin action' });
    fetchUsers();
  };

  const unbanUser = async (id) => {
    await apiPatch('/admin/users/' + id + '/unban');
    fetchUsers();
  };

  const dismissFlag = async (id) => {
    await apiDelete('/admin/anti-cheat/flags/' + id);
    fetchFlags();
  };

  if (loading) return <div className="p-8">Loading admin panel...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="flex gap-2 mb-6 border-b">
        {['overview', 'users', 'features', 'flags'].map((tab) => (
          <button
            key={tab}
            className={'px-4 py-2 font-medium ' + (activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500')}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 shadow rounded">Total Users: {overview.totalUsers}</div>
          <div className="bg-white p-4 shadow rounded">Online Now: {overview.onlineNow}</div>
          <div className="bg-white p-4 shadow rounded">Races Today: {overview.racesToday}</div>
          <div className="bg-white p-4 shadow rounded">Open Flags: {overview.openFlags}</div>
        </div>
      )}

      {activeTab === 'users' && users.length > 0 && (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Username</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Banned</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.isBanned ? 'Yes' : 'No'}</td>
                  <td className="p-2 space-x-2">
                    {u.isBanned ? (
                      <button onClick={() => unbanUser(u.id)} className="text-green-600 hover:underline">Unban</button>
                    ) : (
                      <button onClick={() => banUser(u.id)} className="text-red-600 hover:underline">Ban</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'features' && features.length > 0 && (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr><th className="p-2">Key</th><th className="p-2">Enabled</th><th className="p-2">Toggle</th></tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.key} className="border-t">
                  <td className="p-2">{f.key}</td>
                  <td className="p-2">{f.enabled ? '✅' : '❌'}</td>
                  <td className="p-2">
                    <button onClick={() => toggleFeature(f.key, f.enabled)} className="bg-blue-600 text-white px-2 py-1 rounded">
                      {f.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'flags' && flags.length > 0 && (
        <div className="bg-white shadow rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr><th className="p-2">User</th><th className="p-2">Reason</th><th className="p-2">Severity</th><th className="p-2">Actions</th></tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2">{f.username}</td>
                  <td className="p-2">{f.reason}</td>
                  <td className="p-2">{f.severity}</td>
                  <td className="p-2">
                    <button onClick={() => dismissFlag(f.id)} className="text-green-600 hover:underline">Dismiss</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
