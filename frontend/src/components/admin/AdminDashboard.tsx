'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface AdminItem {
  id: string;
  title: string;
  type: 'art' | 'photography' | 'music' | 'projects' | 'apparel';
  status: 'published' | 'draft';
  createdAt: string;
  updatedAt: string;
}

const mockItems: AdminItem[] = [
  {
    id: '1',
    title: 'Ocean Sunset',
    type: 'photography',
    status: 'published',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Abstract Geometry',
    type: 'art',
    status: 'draft',
    createdAt: '2024-01-14',
    updatedAt: '2024-01-16',
  },
  {
    id: '3',
    title: 'Electronic Dreams',
    type: 'music',
    status: 'published',
    createdAt: '2024-01-13',
    updatedAt: '2024-01-13',
  },
];

export default function AdminDashboard() {
  const [items, setItems] = useState<AdminItem[]>(mockItems);
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredItems = selectedType === 'all' 
    ? items 
    : items.filter(item => item.type === selectedType);

  const getStatusColor = (status: AdminItem['status']) => {
    return status === 'published' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
  };

  const getTypeColor = (type: AdminItem['type']) => {
    const colors = {
      art: 'bg-purple-100 text-purple-800',
      photography: 'bg-blue-100 text-blue-800',
      music: 'bg-pink-100 text-pink-800',
      projects: 'bg-green-100 text-green-800',
      apparel: 'bg-orange-100 text-orange-800',
    };
    return colors[type];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your portfolio content</p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center">
              <PlusIcon className="w-5 h-5 mr-2" />
              Add New Item
            </button>
          </div>

          {/* Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="art">Art</option>
            <option value="photography">Photography</option>
            <option value="music">Music</option>
            <option value="projects">Projects</option>
            <option value="apparel">Apparel</option>
          </select>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                    {item.type}
                  </span>
                </div>
              </div>

              <div className="text-sm text-gray-500 mb-4">
                <p>Created: {item.createdAt}</p>
                <p>Updated: {item.updatedAt}</p>
              </div>

              <div className="flex space-x-2">
                <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center">
                  <EyeIcon className="w-4 h-4 mr-1" />
                  View
                </button>
                <button className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center">
                  <PencilIcon className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center">
                  <TrashIcon className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found for the selected type.</p>
          </div>
        )}
      </div>
    </div>
  );
}