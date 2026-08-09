import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth';
import { getAdminDashboardStats } from '../../api/adminSupabase';
import AdminNavigation from '../../components/AdminNavigation';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setStats(await getAdminDashboardStats());
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <AdminNavigation
        title="Admin Dashboard"
        subtitle={`Welcome back, ${user?.firstName} ${user?.lastName}`}
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon complaints">📋</div>
          <div className="stat-info">
            <h3>{stats?.reports.total || 0}</h3>
            <p>Total Reports</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pending">⏳</div>
          <div className="stat-info">
            <h3>{stats?.reports.pending || 0}</h3>
            <p>Pending</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon progress">🔧</div>
          <div className="stat-info">
            <h3>{stats?.reports.inProgress || 0}</h3>
            <p>In Progress</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon resolved">✅</div>
          <div className="stat-info">
            <h3>{stats?.reports.resolved || 0}</h3>
            <p>Resolved</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon workers">👷</div>
          <div className="stat-info">
            <h3>{stats?.workers.total || 0}</h3>
            <p>Total Workers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active-workers">✨</div>
          <div className="stat-info">
            <h3>{stats?.workers.active || 0}</h3>
            <p>Active Workers</p>
          </div>
        </div>
      </div>

      {stats?.byCategory?.length > 0 && (
        <div className="department-stats">
          <h2>Reports by Category</h2>
          <div className="department-list">
            {stats.byCategory.map((category) => (
              <div key={category.name} className="department-item">
                {category.name} — {category.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
