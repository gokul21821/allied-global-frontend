
// import React, { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
// import {
//   Shield,
//   Search,
//   Filter,
//   RefreshCw,
//   Calendar,
//   User,
//   Activity,
//   ChevronDown,
//   X,
//   Clock,
//   Database,
//   Bot,
//   Phone,
//   MessageSquare,
//   CreditCard,
//   Users,
//   FileText,
//   Wrench,
//   Volume2,
//   PhoneCall,
//   Loader2,
// } from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext';

// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// interface AuditLog {
//   id: string;
//   userEmail: string;
//   userName: string;
//   timestamp: string;
//   action: string;
//   specificAction: string;
//   comment: string;
//   userId: string;
//   metadata: {
//     id: string;
//   };
// }

// interface AuditLogsResponse {
//   logs: AuditLog[];
//   total: number;
//   hasMore: boolean;
// }

// const AuditLogs = () => {
//   const { getEffectiveUser } = useAuth();
//   const effectiveUser = getEffectiveUser();

//   const [logs, setLogs] = useState<AuditLog[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedAction, setSelectedAction] = useState('');
//   const [selectedSpecificAction, setSelectedSpecificAction] = useState('');
//   const [dateAfter, setDateAfter] = useState('');
//   const [dateBefore, setDateBefore] = useState('');
//   const [isFilterOpen, setIsFilterOpen] = useState(false);
//   const [total, setTotal] = useState(0);
//   const [hasMore, setHasMore] = useState(false);

//   // Get unique actions and specific actions from logs
//   const getUniqueActions = () => {
//     const actions = [...new Set(logs.map(log => log.action))];
//     return actions.sort();
//   };

//   const getUniqueSpecificActions = () => {
//     const specificActions = [...new Set(logs.map(log => log.specificAction))];
//     return specificActions.sort();
//   };

//   const fetchAuditLogs = async (showRefreshLoader = false) => {
//     if (!effectiveUser) return;

//     try {
//       if (showRefreshLoader) {
//         setRefreshing(true);
//       } else {
//         setLoading(true);
//       }

//       const response = await fetch(`${BACKEND_URL}/audit/logs`, {
//         headers: {
//           Authorization: `Bearer ${await effectiveUser.getIdToken()}`,
//         },
//       });

//       if (response.ok) {
//         const data: AuditLogsResponse = await response.json();
//         setLogs(data.logs || []);
//         setTotal(data.total || 0);
//         setHasMore(data.hasMore || false);
//       } else {
//         console.error('Failed to fetch audit logs');
//       }
//     } catch (error) {
//       console.error('Error fetching audit logs:', error);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useEffect(() => {
//     fetchAuditLogs();
//   }, [effectiveUser]);

//   const handleRefresh = () => {
//     fetchAuditLogs(true);
//   };

//   // Filter logs based on search and filters
//   const filteredLogs = logs.filter(log => {
//     const matchesSearch = !searchQuery || 
//       log.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       log.userName.toLowerCase().includes(searchQuery.toLowerCase());

//     const matchesAction = !selectedAction || log.action === selectedAction;
//     const matchesSpecificAction = !selectedSpecificAction || log.specificAction === selectedSpecificAction;

//     const matchesDateAfter = !dateAfter || new Date(log.timestamp) >= new Date(dateAfter);
//     const matchesDateBefore = !dateBefore || new Date(log.timestamp) <= new Date(dateBefore);

//     return matchesSearch && matchesAction && matchesSpecificAction && matchesDateAfter && matchesDateBefore;
//   });

//   const getActionIcon = (action: string) => {
//     switch (action) {
//       case 'agent': return Bot;
//       case 'phoneNumber': return Phone;
//       case 'conversation': return MessageSquare;
//       case 'payment': return CreditCard;
//       case 'user': return Users;
//       case 'knowledgeBase': return Database;
//       case 'tool': return Wrench;
//       case 'voice': return Volume2;
//       case 'batchCall': return PhoneCall;
//       default: return Activity;
//     }
//   };

//   const getActionColor = (action: string) => {
//     switch (action) {
//       case 'agent': return 'text-primary';
//       case 'phoneNumber': return 'text-indigo-500';
//       case 'conversation': return 'text-emerald-500';
//       case 'payment': return 'text-amber-500';
//       case 'user': return 'text-purple-500';
//       case 'knowledgeBase': return 'text-rose-500';
//       case 'tool': return 'text-cyan-500';
//       case 'voice': return 'text-pink-500';
//       case 'batchCall': return 'text-orange-500';
//       default: return 'text-gray-500';
//     }
//   };

//   const getSpecificActionBadge = (specificAction: string) => {
//     switch (specificAction) {
//       case 'created':
//         return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">Created</span>;
//       case 'updated':
//         return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Updated</span>;
//       case 'deleted':
//         return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Deleted</span>;
//       case 'completed':
//         return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">Completed</span>;
//       default:
//         return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">{specificAction}</span>;
//     }
//   };

//   const clearFilters = () => {
//     setSelectedAction('');
//     setSelectedSpecificAction('');
//     setDateAfter('');
//     setDateBefore('');
//     setSearchQuery('');
//   };

//   const activeFiltersCount = [selectedAction, selectedSpecificAction, dateAfter, dateBefore, searchQuery].filter(Boolean).length;

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-primary-400" />
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
//         <div>
//           <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
//             Audit Logs
//           </h1>
//           <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
//             Track all system activities and changes ({total} total entries)
//           </p>
//         </div>

//         <button
//           onClick={handleRefresh}
//           disabled={refreshing}
//           className="btn btn-outline flex items-center space-x-2"
//         >
//           <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
//           <span>Refresh</span>
//         </button>
//       </div>

//       {/* Search and Filters */}
//       <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6 mb-6">
//         <div className="flex flex-col lg:flex-row gap-4">
//           {/* Search */}
//           <div className="flex-1">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
//               <input
//                 type="text"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 placeholder="Search logs by comment, user email, or name..."
//                 className="input pl-10 w-full"
//               />
//             </div>
//           </div>

//           {/* Filter Toggle */}
//           <button
//             onClick={() => setIsFilterOpen(!isFilterOpen)}
//             className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-outline'} flex items-center space-x-2`}
//           >
//             <Filter className="w-4 h-4" />
//             <span>Filters</span>
//             {activeFiltersCount > 0 && (
//               <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 ml-1">
//                 {activeFiltersCount}
//               </span>
//             )}
//             <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
//           </button>
//         </div>

//         {/* Expandable Filters */}
//         {isFilterOpen && (
//           <motion.div
//             initial={{ opacity: 0, height: 0 }}
//             animate={{ opacity: 1, height: 'auto' }}
//             exit={{ opacity: 0, height: 0 }}
//             className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-100"
//           >
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               {/* Resource Filter */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                   Resource
//                 </label>
//                 <select
//                   value={selectedAction}
//                   onChange={(e) => setSelectedAction(e.target.value)}
//                   className="input text-sm"
//                 >
//                   <option value="">All Resources</option>
//                   {getUniqueActions().map(action => (
//                     <option key={action} value={action}>{action}</option>
//                   ))}
//                 </select>
//               </div>

//               {/* Action Type Filter */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                   Action Type
//                 </label>
//                 <select
//                   value={selectedSpecificAction}
//                   onChange={(e) => setSelectedSpecificAction(e.target.value)}
//                   className="input text-sm"
//                 >
//                   <option value="">All Action Types</option>
//                   {getUniqueSpecificActions().map(action => (
//                     <option key={action} value={action}>{action}</option>
//                   ))}
//                 </select>
//               </div>

//               {/* Date After */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                   Date After
//                 </label>
//                 <input
//                   type="date"
//                   value={dateAfter}
//                   onChange={(e) => setDateAfter(e.target.value)}
//                   className="input text-sm"
//                 />
//               </div>

//               {/* Date Before */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                   Date Before
//                 </label>
//                 <input
//                   type="date"
//                   value={dateBefore}
//                   onChange={(e) => setDateBefore(e.target.value)}
//                   className="input text-sm"
//                 />
//               </div>
//             </div>

//             {/* Clear Filters */}
//             {activeFiltersCount > 0 && (
//               <div className="mt-4 flex justify-end">
//                 <button
//                   onClick={clearFilters}
//                   className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center space-x-1"
//                 >
//                   <X className="w-4 h-4" />
//                   <span>Clear all filters</span>
//                 </button>
//               </div>
//             )}
//           </motion.div>
//         )}
//       </div>

//       {/* Table */}
//       <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
//         {refreshing ? (
//           <div className="p-8 flex justify-center items-center">
//             <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-primary-400" />
//             <span className="ml-2 text-gray-600 dark:text-gray-400">
//               Refreshing audit logs...
//             </span>
//           </div>
//         ) : filteredLogs.length === 0 ? (
//           <div className="p-8 text-center">
//             <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
//             <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
//               No audit logs found
//             </h3>
//             <p className="text-gray-500 dark:text-gray-400">
//               {activeFiltersCount > 0 || searchQuery
//                 ? "Try adjusting your search or filters"
//                 : "No audit logs have been recorded yet"}
//             </p>
//           </div>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50 dark:bg-dark-100 border-b border-gray-200 dark:border-dark-100">
//                 <tr>
//                   <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     <div className="flex items-center space-x-1">
//                       <Clock className="w-4 h-4" />
//                       <span>Timestamp</span>
//                     </div>
//                   </th>
//                   <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     <div className="flex items-center space-x-1">
//                       <User className="w-4 h-4" />
//                       <span>User</span>
//                     </div>
//                   </th>
//                   <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     <div className="flex items-center space-x-1">
//                       <Activity className="w-4 h-4" />
//                       <span>Resource</span>
//                     </div>
//                   </th>
//                   <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     Action Type
//                   </th>
//                   <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     Description
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
//                 {filteredLogs.map((log, index) => {
//                   const ActionIcon = getActionIcon(log.action);
//                   const actionColor = getActionColor(log.action);

//                   return (
//                     <motion.tr
//                       key={log.id}
//                       initial={{ opacity: 0, y: 20 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       transition={{ delay: index * 0.05 }}
//                       className="hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
//                     >
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
//                         {new Date(log.timestamp).toLocaleString()}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex flex-col">
//                           <div className="text-sm font-medium text-gray-900 dark:text-white">
//                             {log.userName}
//                           </div>
//                           <div className="text-sm text-gray-500 dark:text-gray-400">
//                             {log.userEmail}
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center space-x-2">
//                           <ActionIcon className={`w-4 h-4 ${actionColor}`} />
//                           <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
//                             {log.action}
//                           </span>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         {getSpecificActionBadge(log.specificAction)}
//                       </td>
//                       <td className="px-6 py-4">
//                         <div className="text-sm text-gray-900 dark:text-white">
//                           {log.comment}
//                         </div>
//                         {log.metadata.id && (
//                           <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
//                             ID: {log.metadata.id}
//                           </div>
//                         )}
//                       </td>
//                     </motion.tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Results Summary */}
//       {filteredLogs.length > 0 && (
//         <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
//           Showing {filteredLogs.length} of {total} audit log entries
//           {hasMore && (
//             <span className="ml-2 text-primary dark:text-primary-400">
//               (More entries available)
//             </span>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default AuditLogs;


import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  User,
  Activity,
  ChevronDown,
  X,
  Clock,
  Database,
  Bot,
  Phone,
  MessageSquare,
  CreditCard,
  Users,
  FileText,
  Wrench,
  Volume2,
  PhoneCall,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface AuditLog {
  id: string;
  userEmail: string;
  userName: string;
  timestamp: string;
  action: string;
  specificAction: string;
  comment: string;
  userId: string;
  metadata: {
    id: string;
  };
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  hasMore: boolean;
}

const AuditLogs = () => {
  const { getEffectiveUser } = useAuth();
  const effectiveUser = getEffectiveUser();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedSpecificAction, setSelectedSpecificAction] = useState('');
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my');
  const [userRole, setUserRole] = useState<string>('');

  // Get user role from token or user object
  useEffect(() => {
    const getUserRole = async () => {
      if (effectiveUser) {
        try {
          const token = await effectiveUser.getIdToken();
          const tokenResult = await effectiveUser.getIdTokenResult();
          setUserRole(tokenResult.claims.role || 'user');
        } catch (error) {
          console.error('Error getting user role:', error);
          setUserRole('user');
        }
      }
    };
    getUserRole();
  }, [effectiveUser]);

  const isAdmin = userRole === 'admin';

  // Get unique actions and specific actions from logs
  const getUniqueActions = () => {
    const actions = [...new Set(logs.map(log => log.action))];
    return actions.sort();
  };

  const getUniqueSpecificActions = () => {
    const specificActions = [...new Set(logs.map(log => log.specificAction))];
    return specificActions.sort();
  };

  const fetchAuditLogs = async (showRefreshLoader = false) => {
    if (!effectiveUser) return;

    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Determine endpoint based on view mode and user role
      let endpoint = `${BACKEND_URL}/audit/logs`;

      if (!isAdmin || viewMode === 'my') {
        // Non-admin users or admin viewing their own logs
        endpoint = `${BACKEND_URL}/audit/my-logs`;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${await effectiveUser.getIdToken()}`,
        },
      });

      if (response.ok) {
        const data: AuditLogsResponse = await response.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setHasMore(data.hasMore || false);
      } else {
        console.error('Failed to fetch audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (effectiveUser && userRole) {
      fetchAuditLogs();
    }
  }, [effectiveUser, viewMode, userRole]);

  const handleRefresh = () => {
    fetchAuditLogs(true);
  };

  const handleViewModeToggle = () => {
    setViewMode(viewMode === 'my' ? 'all' : 'my');
  };

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchQuery ||
      log.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = !selectedAction || log.action === selectedAction;
    const matchesSpecificAction = !selectedSpecificAction || log.specificAction === selectedSpecificAction;

    const matchesDateAfter = !dateAfter || new Date(log.timestamp) >= new Date(dateAfter);
    const matchesDateBefore = !dateBefore || new Date(log.timestamp) <= new Date(dateBefore);

    return matchesSearch && matchesAction && matchesSpecificAction && matchesDateAfter && matchesDateBefore;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'agent': return Bot;
      case 'phoneNumber': return Phone;
      case 'conversation': return MessageSquare;
      case 'payment': return CreditCard;
      case 'user': return Users;
      case 'knowledgeBase': return Database;
      case 'tool': return Wrench;
      case 'voice': return Volume2;
      case 'batchCall': return PhoneCall;
      default: return Activity;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'agent': return 'text-primary';
      case 'phoneNumber': return 'text-indigo-500';
      case 'conversation': return 'text-emerald-500';
      case 'payment': return 'text-amber-500';
      case 'user': return 'text-purple-500';
      case 'knowledgeBase': return 'text-rose-500';
      case 'tool': return 'text-cyan-500';
      case 'voice': return 'text-pink-500';
      case 'batchCall': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getSpecificActionBadge = (specificAction: string) => {
    switch (specificAction) {
      case 'created':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">Created</span>;
      case 'updated':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">Updated</span>;
      case 'deleted':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Deleted</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">Completed</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">{specificAction}</span>;
    }
  };

  const clearFilters = () => {
    setSelectedAction('');
    setSelectedSpecificAction('');
    setDateAfter('');
    setDateBefore('');
    setSearchQuery('');
  };

  const activeFiltersCount = [selectedAction, selectedSpecificAction, dateAfter, dateBefore, searchQuery].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-primary-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Audit Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin && viewMode === 'all'
              ? `Track all system activities and changes (${total} total entries)`
              : `Track your activities and changes (${total} total entries)`}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode Toggle (Admin Only) */}
          {isAdmin && (
            <button
              onClick={handleViewModeToggle}
              className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-outline'} flex items-center space-x-2`}
            >
              {viewMode === 'all' ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span>All Logs</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span>My Logs</span>
                </>
              )}
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-outline flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* View Mode Info Banner */}
      {isAdmin && (
        <div className={`mb-6 p-4 rounded-lg border ${viewMode === 'all'
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
          }`}>
          <div className="flex items-center space-x-2">
            {viewMode === 'all' ? (
              <>
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Admin View: Viewing all system audit logs
                </span>
              </>
            ) : (
              <>
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
                  Personal View: Viewing only your audit logs
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Non-Admin Info Banner */}
      {!isAdmin && (
        <div className="mb-6 p-4 rounded-lg border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-200">
              You are viewing your personal audit logs
            </span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs by comment, user email, or name..."
                className="input pl-10 w-full"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-outline'} flex items-center space-x-2`}
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-white text-xs rounded-full px-2 py-0.5 ml-1">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable Filters */}
        {isFilterOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-100"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Resource Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Resource
                </label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">All Resources</option>
                  {getUniqueActions().map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              {/* Action Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Action Type
                </label>
                <select
                  value={selectedSpecificAction}
                  onChange={(e) => setSelectedSpecificAction(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">All Action Types</option>
                  {getUniqueSpecificActions().map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              {/* Date After */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date After
                </label>
                <input
                  type="date"
                  value={dateAfter}
                  onChange={(e) => setDateAfter(e.target.value)}
                  className="input text-sm"
                />
              </div>

              {/* Date Before */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date Before
                </label>
                <input
                  type="date"
                  value={dateBefore}
                  onChange={(e) => setDateBefore(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center space-x-1"
                >
                  <X className="w-4 h-4" />
                  <span>Clear all filters</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100 overflow-hidden">
        {refreshing ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary dark:text-primary-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">
              Refreshing audit logs...
            </span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-heading font-medium text-gray-900 dark:text-white mb-2">
              No audit logs found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {activeFiltersCount > 0 || searchQuery
                ? "Try adjusting your search or filters"
                : "No audit logs have been recorded yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-100 border-b border-gray-200 dark:border-dark-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Timestamp</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>User</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center space-x-1">
                      <Activity className="w-4 h-4" />
                      <span>Resource</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                {filteredLogs.map((log, index) => {
                  const ActionIcon = getActionIcon(log.action);
                  const actionColor = getActionColor(log.action);

                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.userName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {log.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <ActionIcon className={`w-4 h-4 ${actionColor}`} />
                          <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getSpecificActionBadge(log.specificAction)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {log.comment}
                        </div>
                        {log.metadata.id && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            ID: {log.metadata.id}
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredLogs.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Showing {filteredLogs.length} of {total} audit log entries
          {hasMore && (
            <span className="ml-2 text-primary dark:text-primary-400">
              (More entries available)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;