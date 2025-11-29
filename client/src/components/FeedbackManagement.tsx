import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  Star,
  Clock,
  Check,
  AlertTriangle,
  Search,
  Filter,
  ChevronDown,
  Send
} from 'lucide-react';
import { format } from 'date-fns';

interface Feedback {
  _id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  type: string;
  rating: {
    overall: number;
    speed: number;
    reliability: number;
    support: number;
    value: number;
  };
  comment: string;
  status: string;
  sentiment: string;
  createdAt: string;
  response?: {
    content: string;
    respondedAt: string;
  };
}

const FeedbackManagement: React.FC = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [response, setResponse] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    sentiment: '',
    minRating: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeedback = async (reset = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page: reset ? 1 : page,
          ...filters,
          search: searchTerm,
        },
      });

      const { data, pagination } = response.data;
      
      if (reset || page === 1) {
        setFeedback(data);
      } else {
        setFeedback(prev => [...prev, ...data]);
      }

      setHasMore(page < pagination.pages);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback(true);
  }, [filters, searchTerm]);

  useEffect(() => {
    if (page > 1) {
      fetchFeedback();
    }
  }, [page]);

  const handleRespond = async () => {
    if (!selectedFeedback || !response.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/feedback/${selectedFeedback._id}`,
        { response, status: 'responded' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update feedback list
      setFeedback(prev =>
        prev.map(f =>
          f._id === selectedFeedback._id
            ? {
                ...f,
                status: 'responded',
                response: {
                  content: response,
                  respondedAt: new Date().toISOString(),
                },
              }
            : f
        )
      );

      setSelectedFeedback(null);
      setResponse('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send response');
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-500';
      case 'negative':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded':
        return 'text-green-500 bg-green-100';
      case 'pending':
        return 'text-yellow-500 bg-yellow-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
          fill={star <= rating ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Feedback Management</h1>

      {/* Filters and Search */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search feedback..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="service">Service</option>
          <option value="support">Support</option>
          <option value="billing">Billing</option>
          <option value="general">General</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="responded">Responded</option>
        </select>

        <select
          value={filters.sentiment}
          onChange={(e) => setFilters(prev => ({ ...prev, sentiment: e.target.value }))}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Sentiments</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
        </select>

        <select
          value={filters.minRating}
          onChange={(e) => setFilters(prev => ({ ...prev, minRating: e.target.value }))}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4+ Stars</option>
          <option value="3">3+ Stars</option>
          <option value="2">2+ Stars</option>
          <option value="1">1+ Star</option>
        </select>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedback.map((item) => (
          <div key={item._id} className="bg-white p-6 rounded-lg shadow">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold">
                  {item.user.firstName} {item.user.lastName}
                </h3>
                <p className="text-sm text-gray-500">{item.user.email}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(item.status)}`}>
                  {(item.status || 'unknown').charAt(0).toUpperCase() + (item.status || 'unknown').slice(1)}
                </span>
                <span className={`${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment === 'positive' ? (
                    <Check size={20} />
                  ) : item.sentiment === 'negative' ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <Clock size={20} />
                  )}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{item.type}</span>
                <StarRating rating={item.rating.overall} />
              </div>
              <p className="text-gray-700">{item.comment}</p>
            </div>

            {/* Response Section */}
            {item.response ? (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Response:</p>
                <p className="text-gray-700">{item.response.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Responded on {format(new Date(item.response.respondedAt), 'MMM dd, yyyy')}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setSelectedFeedback(item)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Respond to Feedback
              </button>
            )}

            <div className="mt-4 text-sm text-gray-500">
              Submitted on {format(new Date(item.createdAt), 'MMM dd, yyyy')}
            </div>
          </div>
        ))}

        {loading && <div className="text-center py-4">Loading feedback...</div>}

        {error && <div className="text-red-500 text-center py-4">{error}</div>}

        {hasMore && !loading && (
          <div className="text-center py-4">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Response Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">
              Respond to {selectedFeedback.user.firstName}'s Feedback
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                Your Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your response here..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedFeedback(null);
                  setResponse('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={!response.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackManagement;