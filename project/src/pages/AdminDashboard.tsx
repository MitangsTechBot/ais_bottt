import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChatStats {
  total_messages: number;
  total_users: number;
  messages_today: number;
  active_users_today: number;
}

interface UserMessage {
  id: string;
  email: string;
  message: string;
  ai_response: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<ChatStats>({
    total_messages: 0,
    total_users: 0,
    messages_today: 0,
    active_users_today: 0,
  });
  const [recentMessages, setRecentMessages] = useState<UserMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch basic stats
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('id, created_at, user_id');
      
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const messagesToday = messagesData?.filter(msg => 
        new Date(msg.created_at) >= today
      ).length || 0;

      // Get unique active users today
      const activeUsersToday = new Set(
        messagesData
          ?.filter(msg => new Date(msg.created_at) >= today)
          .map(msg => msg.user_id)
      ).size;

      // Fetch recent messages with user details using a single query
      const { data: recent, error: recentError } = await supabase
        .from('chat_messages')
        .select(`
          id,
          message,
          ai_response,
          created_at,
          user_id,
          user_profiles (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentError) throw recentError;

      setStats({
        total_messages: messagesData?.length || 0,
        total_users: usersData?.length || 0,
        messages_today: messagesToday,
        active_users_today: activeUsersToday,
      });

      // Transform the data to match the UserMessage interface
      const transformedMessages = recent?.map(msg => ({
        id: msg.id,
        email: msg.user_profiles?.[0]?.email || 'Unknown',
        message: msg.message,
        ai_response: msg.ai_response,
        created_at: new Date(msg.created_at).toLocaleString(),
      })) || [];

      setRecentMessages(transformedMessages);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Messages</h3>
          <p className="text-2xl font-bold mt-2">{stats.total_messages}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
          <p className="text-2xl font-bold mt-2">{stats.total_users}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Messages Today</h3>
          <p className="text-2xl font-bold mt-2">{stats.messages_today}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Active Users Today</h3>
          <p className="text-2xl font-bold mt-2">{stats.active_users_today}</p>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Recent Messages</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Response
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentMessages.map((msg) => (
                <tr key={msg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {msg.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {msg.message}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {msg.ai_response}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {msg.created_at}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}