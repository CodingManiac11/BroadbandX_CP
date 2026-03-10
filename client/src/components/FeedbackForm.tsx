import React, { useState } from 'react';
import axios from 'axios';
import { Star, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RatingCategory {
  name: string;
  label: string;
  value: number;
}

interface FeedbackFormProps {
  onSubmitSuccess?: () => void;
  type?: 'service' | 'support' | 'billing' | 'general';
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
  onSubmitSuccess,
  type = 'general'
}) => {
  const [ratings, setRatings] = useState<Record<string, number>>({
    overall: 0,
    speed: 0,
    reliability: 0,
    support: 0,
    value: 0
  });
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ratingCategories: RatingCategory[] = [
    { name: 'overall', label: 'Overall Experience', value: ratings.overall },
    { name: 'speed', label: 'Internet Speed', value: ratings.speed },
    { name: 'reliability', label: 'Service Reliability', value: ratings.reliability },
    { name: 'support', label: 'Customer Support', value: ratings.support },
    { name: 'value', label: 'Value for Money', value: ratings.value }
  ];

  const handleRatingChange = (category: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

      await axios.post(
        `${API_URL}/feedback`,
        {
          type,
          rating: ratings,
          comment,
          isAnonymous,
          isPublic
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess(true);
      setComment('');
      setRatings({
        overall: 0,
        speed: 0,
        reliability: 0,
        support: 0,
        value: 0
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const RatingStars: React.FC<{
    value: number;
    onChange: (value: number) => void;
    size?: number;
  }> = ({ value, onChange, size = 24 }) => (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          whileHover={{ scale: 1.1 }}
          onClick={() => onChange(star)}
          className={`focus:outline-none ${star <= value ? 'text-yellow-400' : 'text-gray-300'
            }`}
        >
          <Star
            size={size}
            fill={star <= value ? 'currentColor' : 'none'}
          />
        </motion.button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Share Your Feedback</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Categories */}
        <div className="space-y-4">
          {ratingCategories.map(category => (
            <div key={category.name} className="flex flex-col sm:flex-row sm:items-center justify-between">
              <label className="text-gray-700 mb-2 sm:mb-0">{category.label}</label>
              <RatingStars
                value={category.value}
                onChange={(value) => handleRatingChange(category.name, value)}
              />
            </div>
          ))}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-gray-700 mb-2">
            Additional Comments
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Share your experience with our service..."
            required
          />
        </div>

        {/* Privacy Options */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Submit Anonymously</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Share Publicly</span>
          </label>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center text-red-500 space-x-2"
            >
              <AlertCircle size={20} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Message */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-green-500"
            >
              Thank you for your feedback!
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !ratings.overall}
          className={`w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${loading ? 'cursor-wait' : ''
            }`}
        >
          <Send size={20} />
          <span>{loading ? 'Submitting...' : 'Submit Feedback'}</span>
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;