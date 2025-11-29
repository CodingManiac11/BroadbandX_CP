import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Smile, Meh, Frown, TrendingUp, Users, Star, MessageCircle } from 'lucide-react';

interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  averageRatings: {
    avgOverall: number;
    avgSpeed: number;
    avgReliability: number;
    avgSupport: number;
    avgValue: number;
  };
  trends: Array<{
    _id: string;
    averageRating: number;
    count: number;
  }>;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

const FeedbackAnalytics: React.FC = () => {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/feedback/stats?timeframe=${timeframe}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch feedback statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!stats) return <div>No data available</div>;

  const sentimentData = [
    { name: 'Positive', value: stats.sentimentDistribution.positive },
    { name: 'Neutral', value: stats.sentimentDistribution.neutral },
    { name: 'Negative', value: stats.sentimentDistribution.negative }
  ];

  const ratingData = [
    { name: 'Overall', rating: stats.averageRatings.avgOverall },
    { name: 'Speed', rating: stats.averageRatings.avgSpeed },
    { name: 'Reliability', rating: stats.averageRatings.avgReliability },
    { name: 'Support', rating: stats.averageRatings.avgSupport },
    { name: 'Value', rating: stats.averageRatings.avgValue }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Feedback Analytics</h1>
        
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Feedback</p>
              <p className="text-2xl font-semibold">{stats.totalFeedback}</p>
            </div>
            <MessageCircle className="text-blue-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Average Rating</p>
              <p className="text-2xl font-semibold">
                {stats.averageRating.toFixed(1)}
                <span className="text-sm text-gray-500">/5</span>
              </p>
            </div>
            <Star className="text-yellow-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Positive Feedback</p>
              <p className="text-2xl font-semibold">
                {stats.sentimentDistribution.positive.toFixed(1)}%
              </p>
            </div>
            <Smile className="text-green-500" size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Negative Feedback</p>
              <p className="text-2xl font-semibold">
                {stats.sentimentDistribution.negative.toFixed(1)}%
              </p>
            </div>
            <Frown className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Sentiment Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Categories */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Rating Categories</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="rating" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feedback Trends */}
        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Feedback Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="averageRating"
                stroke="#3B82F6"
                name="Average Rating"
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#10B981"
                name="Number of Reviews"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FeedbackAnalytics;