// src/components/AdminStatistics.jsx
import React, { useEffect, useState } from 'react';
import { Pie, Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import './AdminDashboard.css';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function AdminStatistics() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mentorActivity, setMentorActivity] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5050/api/admin-submissions')
      .then((res) => res.json())
      .then((data) => {
        setSubmissions(data);
        setLoading(false);
      });

    fetch('http://localhost:5050/api/mentor-activity')
      .then(res => res.json())
      .then(data => setMentorActivity(data));
  }, []);

  const getMetrics = () => {
    const total = submissions.length;
    const scheduled = submissions.filter(sub => sub.event_id).length;
    const canceled = submissions.filter(sub => (sub.status || '').toLowerCase() === 'canceled').length;
    const advisors = [...new Set(submissions.map(sub => sub.pickedBy).filter(Boolean))].length;

    const times = submissions
      .filter(sub => sub.submitted && sub.updated_at)
      .map(sub => new Date(sub.updated_at) - new Date(sub.submitted))
      .filter(t => !isNaN(t));

    const avgDays = times.length > 0
      ? (times.reduce((a, b) => a + b, 0) / times.length / (1000 * 60 * 60 * 24)).toFixed(1)
      : 'N/A';

    return { total, scheduled, canceled, advisors, avgDays };
  };

  const metrics = getMetrics();

  const getIndustryChartData = () => {
    const counts = submissions.reduce((acc, { industry }) => {
      if (!industry) return acc;
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top5 = entries.slice(0, 5);
    const other = entries.slice(5).reduce((sum, [, count]) => sum + count, 0);
    if (other > 0) top5.push(["Other", other]);

    return {
      labels: top5.map(([label]) => label),
      datasets: [{
        data: top5.map(([, count]) => count),
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#9ca3af'],
      }]
    };
  };

  const getSubmissionTrendData = () => {
    const dateCounts = submissions.reduce((acc, { submitted }) => {
      const date = new Date(submitted).toLocaleDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b));
    return {
      labels,
      datasets: [{
        label: "Submissions",
        data: labels.map(date => dateCounts[date]),
        fill: false,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        tension: 0.3,
      }]
    };
  };

  const getStatusBarData = () => {
    const statusCounts = submissions.reduce((acc, { status }) => {
      const key = (status || "To Do").trim();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const labels = Object.keys(statusCounts);
    return {
      labels,
      datasets: [{
        label: 'Submission Status',
        data: labels.map(l => statusCounts[l]),
        backgroundColor: '#10b981',
      }]
    };
  };

  const formatAction = (action) => {
    switch (action) {
      case 'login':
        return 'has logged in';
      case 'propose':
        return 'has proposed a meeting';
      case 'cancel':
        return 'has canceled a meeting';
      case 'message':
        return 'has sent a message';
      default:
        return `performed action: ${action}`;
    }
  };

  const renderModalContent = () => {
    if (!selectedMetric) return null;

    let content = null;

    switch (selectedMetric) {
      case 'submissions':
        content = submissions.map((s, i) => (
          <p key={i}>{s.name} – {s.email} – {s.phone}</p>
        ));
        break;
      case 'proposed':
        content = mentorActivity
          .filter(entry => entry.action === 'propose')
          .map((entry, i) => (
            <p key={i}>{entry.email} has proposed a meeting {entry.details} – {new Date(entry.timestamp).toLocaleString()}</p>
          ));
        break;
      case 'canceled':
        content = submissions
            .filter(sub => (sub.status || '').toLowerCase() === 'canceled')
            .map((sub, i) => (
            <p key={i}>
                {sub.pickedByEmail || 'Unknown mentor'} canceled a meeting with {sub.name} – {sub.email} – {sub.phone}
            </p>
            ));
        break;

      case 'advisors':
        const uniqueAdvisors = [...new Set(submissions.map(sub => sub.pickedBy).filter(Boolean))];
        content = uniqueAdvisors.map((advisor, i) => <p key={i}>{advisor}</p>);
        break;
      case 'avgDays':
        content = submissions
          .filter(sub => sub.submitted && sub.updated_at)
          .map((sub, i) => (
            <p key={i}>
              {sub.name} – submitted: {new Date(sub.submitted).toLocaleDateString()} → scheduled: {new Date(sub.updated_at).toLocaleDateString()}
            </p>
          ));
        break;
      default:
        content = <p>No data available</p>;
    }

    return (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
          <h2 style={{ marginBottom: '16px' }}>{selectedMetric.toUpperCase()}</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>{content}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="dashboard-title">ADMIN STATISTICS</h1>
        <div className="admin-actions">
          <a href="/admin-dashboard" className="stats-btn">← Back to Dashboard</a>
        </div>
      </header>

      <div className="dashboard-content">
        {loading ? (
          <p className="dashboard-status-text">Loading statistics...</p>
        ) : (
          <>
            <div className="card-grid">
              <div className="stat-card" onClick={() => { setSelectedMetric("submissions"); setShowModal(true); }}>
                <strong>Total Submissions:</strong> {metrics.total}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric("proposed"); setShowModal(true); }}>
                <strong>Meetings Proposed:</strong> {metrics.scheduled}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric("canceled"); setShowModal(true); }}>
                <strong>Meetings Canceled:</strong> {metrics.canceled}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric("advisors"); setShowModal(true); }}>
                <strong>Unique Advisors:</strong> {metrics.advisors}
              </div>
              <div className="stat-card" onClick={() => { setSelectedMetric("avgDays"); setShowModal(true); }}>
                <strong>Avg Days to Schedule:</strong> {metrics.avgDays}
              </div>
            </div>

            <div className="side-by-side-charts">
              <div className="chart-wrapper">
                <h3>Top Industries</h3>
                <Pie data={getIndustryChartData()} />
              </div>
              <div className="chart-wrapper">
                <h3>Status Distribution</h3>
                <Bar data={getStatusBarData()} />
              </div>
            </div>

            <div className="chart-wrapper">
              <h3>Submission Trends</h3>
              <Line data={getSubmissionTrendData()} />
            </div>

            <h2 style={{ marginTop: '48px' }}>Activity Center</h2>
            <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {mentorActivity.map((entry, index) => {
                    const base = entry.email;
                    const action = entry.action;
                    const details = entry.details ? ` ${entry.details}` : "";
                    let description = "";

                    switch (action) {
                      case 'login':
                        description = `${base} has logged in`;
                        break;
                      case 'propose':
                        description = `${base} has proposed a meeting${details}`;
                        break;
                      case 'cancel':
                        description = `${base} has canceled a meeting${details}`;
                        break;
                      case 'message':
                        description = `${base} has sent a message${details}`;
                        break;
                      default:
                        description = `${base} performed ${action}${details}`;
                    }

                    return (
                      <tr key={index}>
                        <td>{description}</td>
                        <td>{new Date(entry.timestamp).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {showModal && renderModalContent()}
          </>
        )}
      </div>
    </div>
  );
}
