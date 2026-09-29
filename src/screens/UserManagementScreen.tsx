// import React, {useEffect, useState, useCallback} from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   Alert,
//   Platform,
// } from 'react-native';
// import {getPendingApprovals, approveUser, rejectUser, getUsers} from '../api/auth';

// type UserRow = {
//   id: string;
//   displayName?: string;
//   name?: string;
//   email: string;
//   role: string;
// };

// const ROLE_OPTIONS = ['Admin', 'Surveyor', 'QC', 'Manager', 'Client'];

// // Same "colored chip" pattern used for project status badges on the Dashboard,
// // so role tags read consistently across the app.
// const ROLE_COLORS: Record<string, {bg: string; text: string}> = {
//   Admin: {bg: '#f1eaf3', text: '#8053a6'},
//   Surveyor: {bg: '#e5eef7', text: '#3b68aa'},
//   QC: {bg: '#fff0d7', text: '#a75a0b'},
//   Manager: {bg: '#f0eeff', text: '#718be8'},
//   Client: {bg: '#f0f1f6', text: '#5b6178'},
// };
// const roleStyle = (role: string) => ROLE_COLORS[role] ?? ROLE_COLORS.Client;

// type Props = {
//   onBack: () => void;
// };

// export default function UserManagementScreen({onBack}: Props) {
//   const [pending, setPending] = useState<UserRow[]>([]);
//   const [approved, setApproved] = useState<UserRow[]>([]);
//   const [rejected, setRejected] = useState<UserRow[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [actioningId, setActioningId] = useState<string | null>(null);

//   const loadAll = useCallback(async () => {
//     setLoading(true);
//     try {
//       const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
//         getPendingApprovals(),
//         getUsers('Approved'),
//         getUsers('Rejected'),
//       ]);
//       setPending(pendingRes.data);
//       setApproved(approvedRes.data);
//       setRejected(rejectedRes.data);
//     } catch (err: any) {
//       console.error(err?.response?.data || err.message);
//       Alert.alert('Error', 'Could not load users');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadAll();
//   }, [loadAll]);

//   const name = (u: UserRow) => u.displayName || u.name || u.email;

//   const handleApprove = async (user: UserRow) => {
//     setActioningId(user.id);
//     try {
//       await approveUser(user.id);
//       setPending(prev => prev.filter(u => u.id !== user.id));
//       setApproved(prev => [...prev, user]);
//     } catch (err: any) {
//       console.error(err?.response?.data || err.message);
//       Alert.alert('Error', 'Could not approve user');
//     } finally {
//       setActioningId(null);
//     }
//   };

//   const handleReject = async (user: UserRow, from: 'pending' | 'approved') => {
//     setActioningId(user.id);
//     try {
//       await rejectUser(user.id);
//       if (from === 'pending') {
//         setPending(prev => prev.filter(u => u.id !== user.id));
//       } else {
//         setApproved(prev => prev.filter(u => u.id !== user.id));
//       }
//       setRejected(prev => [...prev, user]);
//     } catch (err: any) {
//       console.error(err?.response?.data || err.message);
//       Alert.alert('Error', 'Could not reject user');
//     } finally {
//       setActioningId(null);
//     }
//   };

//   const handleReapprove = async (user: UserRow) => {
//     setActioningId(user.id);
//     try {
//       await approveUser(user.id);
//       setRejected(prev => prev.filter(u => u.id !== user.id));
//       setApproved(prev => [...prev, user]);
//     } catch (err: any) {
//       console.error(err?.response?.data || err.message);
//       Alert.alert('Error', 'Could not approve user');
//     } finally {
//       setActioningId(null);
//     }
//   };

//   const handleRoleChange = (user: UserRow, newRole: string) => {
//     // TODO: wire to real change-role endpoint once backend confirms it
//     console.log('Change role for', user.email, 'to', newRole);
//   };

//   if (loading) {
//     return (
//       <View style={styles.loadingScreen}>
//         <ActivityIndicator color="#718be8" size="large" />
//       </View>
//     );
//   }

//   return (
//     <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
//       <View style={styles.header}>
//         <View>
//           <Text style={styles.title}>Manage User Registrations</Text>
//           <Text style={styles.subtitle}>Approve, reject, and manage roles for app users</Text>
//         </View>
//         <TouchableOpacity onPress={onBack} style={styles.backBtn}>
//           <Text style={styles.backBtnText}>← Back to Home</Text>
//         </TouchableOpacity>
//       </View>

//       <UserTable
//         title="Pending Approvals"
//         countBadge={pending.length}
//         columns={['Username', 'Email', 'Requested Role', 'Action']}
//         emptyText="No pending approvals"
//         rows={pending}
//         renderRow={user => (
//           <>
//             <Cell flex={1.1} bold>{name(user)}</Cell>
//             <Cell flex={1.6} muted>{user.email}</Cell>
//             <Cell flex={1.3}>
//               <RoleChip role={user.role} />
//             </Cell>
//             <View style={[styles.colAction, styles.actionCell]}>
//               <PillButton
//                 label="Approve"
//                 variant="approve"
//                 loading={actioningId === user.id}
//                 onPress={() => handleApprove(user)}
//               />
//               <PillButton
//                 label="Reject"
//                 variant="reject"
//                 disabled={actioningId === user.id}
//                 onPress={() => handleReject(user, 'pending')}
//               />
//             </View>
//           </>
//         )}
//       />

//       <UserTable
//         title="Approved Users"
//         countBadge={approved.length}
//         columns={['Username', 'Email', 'Current Role', 'Change Role']}
//         emptyText="No approved users yet"
//         rows={approved}
//         wideAction
//         renderRow={user => (
//           <>
//             <Cell flex={1.1} bold>{name(user)}</Cell>
//             <Cell flex={1.6} muted>{user.email}</Cell>
//             <Cell flex={1.3}>
//               <RoleChip role={user.role} />
//             </Cell>
//             <View style={[styles.colChangeRole, styles.actionCell]}>
//               <RoleDropdown value={user.role} onChange={role => handleRoleChange(user, role)} />
//               <PillButton
//                 label="Reject"
//                 variant="reject"
//                 disabled={actioningId === user.id}
//                 onPress={() => handleReject(user, 'approved')}
//               />
//             </View>
//           </>
//         )}
//       />

//       <UserTable
//         title="Rejected Users"
//         countBadge={rejected.length}
//         columns={['Username', 'Email', 'Requested Role', 'Action']}
//         emptyText="No rejected users"
//         rows={rejected}
//         renderRow={user => (
//           <>
//             <Cell flex={1.1} bold>{name(user)}</Cell>
//             <Cell flex={1.6} muted>{user.email}</Cell>
//             <Cell flex={1.3}>
//               <RoleChip role={user.role} />
//             </Cell>
//             <View style={[styles.colAction, styles.actionCell]}>
//               <PillButton
//                 label="Approve"
//                 variant="approve"
//                 loading={actioningId === user.id}
//                 onPress={() => handleReapprove(user)}
//               />
//             </View>
//           </>
//         )}
//       />
//     </ScrollView>
//   );
// }

// // ---------- Small presentational building blocks ----------

// function UserTable({
//   title,
//   countBadge,
//   columns,
//   rows,
//   emptyText,
//   renderRow,
//   wideAction,
// }: {
//   title: string;
//   countBadge: number;
//   columns: string[];
//   rows: UserRow[];
//   emptyText: string;
//   renderRow: (user: UserRow) => React.ReactNode;
//   wideAction?: boolean;
// }) {
//   return (
//     <View style={styles.section}>
//       <View style={styles.sectionHeader}>
//         <Text style={styles.sectionTitle}>{title}</Text>
//         <View style={styles.countBadge}>
//           <Text style={styles.countBadgeText}>{countBadge}</Text>
//         </View>
//       </View>

//       <View style={styles.table}>
//         <View style={styles.headerRow}>
//           <Text style={[styles.th, styles.colUsername]}>{columns[0]}</Text>
//           <Text style={[styles.th, styles.colEmail]}>{columns[1]}</Text>
//           <Text style={[styles.th, styles.colRole]}>{columns[2]}</Text>
//           <Text style={[styles.th, wideAction ? styles.colChangeRole : styles.colAction]}>
//             {columns[3]}
//           </Text>
//         </View>

//         {rows.length === 0 ? (
//           <View style={styles.emptyRow}>
//             <Text style={styles.emptyText}>{emptyText}</Text>
//           </View>
//         ) : (
//           rows.map((user, idx) => (
//             <View key={user.id} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
//               {renderRow(user)}
//             </View>
//           ))
//         )}
//       </View>
//     </View>
//   );
// }

// function Cell({
//   children,
//   flex,
//   bold,
//   muted,
// }: {
//   children: React.ReactNode;
//   flex: number;
//   bold?: boolean;
//   muted?: boolean;
// }) {
//   return (
//     <Text
//       style={[
//         styles.td,
//         {flex},
//         bold && styles.tdBold,
//         muted && styles.tdMuted,
//       ]}
//       numberOfLines={1}>
//       {children}
//     </Text>
//   );
// }

// function RoleChip({role}: {role: string}) {
//   const c = roleStyle(role);
//   return (
//     <View style={[styles.chip, {backgroundColor: c.bg}]}>
//       <Text style={[styles.chipText, {color: c.text}]}>{role}</Text>
//     </View>
//   );
// }

// function PillButton({
//   label,
//   variant,
//   onPress,
//   loading,
//   disabled,
// }: {
//   label: string;
//   variant: 'approve' | 'reject';
//   onPress: () => void;
//   loading?: boolean;
//   disabled?: boolean;
// }) {
//   return (
//     <TouchableOpacity
//       style={[
//         styles.pillBtn,
//         variant === 'approve' ? styles.approveBtn : styles.rejectBtn,
//         disabled && styles.pillBtnDisabled,
//       ]}
//       onPress={onPress}
//       disabled={disabled || loading}>
//       {loading ? (
//         <ActivityIndicator color="#fff" size="small" />
//       ) : (
//         <Text style={styles.pillBtnText}>{label}</Text>
//       )}
//     </TouchableOpacity>
//   );
// }

// function RoleDropdown({value, onChange}: {value: string; onChange: (r: string) => void}) {
//   if (Platform.OS === 'web') {
//     return (
//       // @ts-ignore
//       <select value={value} onChange={(e: any) => onChange(e.target.value)} style={selectStyleWeb}>
//         {ROLE_OPTIONS.map(role => (
//           <option key={role} value={role}>
//             {role}
//           </option>
//         ))}
//       </select>
//     );
//   }
//   return (
//     <TouchableOpacity
//       style={styles.nativeDropdown}
//       onPress={() => {
//         const next = ROLE_OPTIONS[(ROLE_OPTIONS.indexOf(value) + 1) % ROLE_OPTIONS.length];
//         onChange(next);
//       }}>
//       <Text style={styles.nativeDropdownText}>{value} ▾</Text>
//     </TouchableOpacity>
//   );
// }

// const selectStyleWeb: any = {
//   padding: '8px 12px',
//   borderRadius: 8,
//   border: '1.5px solid #dce5dd',
//   fontSize: 13,
//   fontWeight: 600,
//   color: '#252f50',
//   backgroundColor: '#f8f9fc',
//   marginRight: 8,
//   outline: 'none',
// };

// // ---------- Styles (matching DashboardScreen / Sidebar design language) ----------

// const styles = StyleSheet.create({
//   screen: {flex: 1, backgroundColor: '#f7f9ff'},
//   loadingScreen: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f9ff'},
//   content: {padding: 28, minHeight: '100%' as any},

//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     marginBottom: 28,
//   },
//   title: {fontSize: 22, fontWeight: '800', color: '#252f50'},
//   subtitle: {fontSize: 13, color: '#8a8fa3', marginTop: 4},
//   backBtn: {
//     backgroundColor: '#f0eeff',
//     borderRadius: 10,
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//   },
//   backBtnText: {color: '#8fa7f8', fontSize: 13, fontWeight: '700'},

//   section: {marginBottom: 26},
//   sectionHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 10,
//     marginBottom: 12,
//   },
//   sectionTitle: {fontSize: 16, fontWeight: '800', color: '#252f50'},
//   countBadge: {
//     minWidth: 22,
//     height: 22,
//     borderRadius: 11,
//     paddingHorizontal: 6,
//     backgroundColor: '#f0eeff',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   countBadgeText: {fontSize: 11.5, fontWeight: '800', color: '#8fa7f8'},

//   table: {
//     backgroundColor: '#fff',
//     borderRadius: 18,
//     overflow: 'hidden',
//     ...Platform.select({
//       web: {boxShadow: '0px 4px 18px rgba(26, 35, 126, 0.06)'},
//       default: {
//         shadowColor: '#718be8',
//         shadowOffset: {width: 0, height: 4},
//         shadowOpacity: 0.06,
//         shadowRadius: 12,
//         elevation: 2,
//       },
//     }),
//   },
//   headerRow: {
//     flexDirection: 'row',
//     backgroundColor: '#f8f9fc',
//     paddingVertical: 12,
//     paddingHorizontal: 18,
//   },
//   th: {fontSize: 12, fontWeight: '700', color: '#5b6178', letterSpacing: 0.3},
//   row: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 18,
//     borderTopWidth: 1,
//     borderTopColor: '#f0f1f6',
//   },
//   rowAlt: {backgroundColor: '#fafbfd'},
//   td: {fontSize: 13.5, color: '#2a2d3b'},
//   tdBold: {fontWeight: '700', color: '#252f50'},
//   tdMuted: {color: '#8a8fa3'},
//   colUsername: {flex: 1.1},
//   colEmail: {flex: 1.6},
//   colRole: {flex: 1.3},
//   colAction: {flex: 1.4},
//   colChangeRole: {flex: 2},

//   chip: {
//     alignSelf: 'flex-start',
//     paddingHorizontal: 10,
//     paddingVertical: 4,
//     borderRadius: 8,
//   },
//   chipText: {fontSize: 11.5, fontWeight: '700'},

//   actionCell: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
//   emptyRow: {paddingVertical: 26, alignItems: 'center'},
//   emptyText: {fontSize: 13, color: '#9aa0b4'},

//   pillBtn: {
//     borderRadius: 8,
//     paddingVertical: 8,
//     paddingHorizontal: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     minWidth: 80,
//   },
//   pillBtnDisabled: {opacity: 0.6},
//   approveBtn: {backgroundColor: '#718be8'},
//   rejectBtn: {backgroundColor: '#ba4e3c'},
//   pillBtnText: {color: '#fff', fontSize: 12.5, fontWeight: '700'},

//   nativeDropdown: {
//     borderWidth: 1.5,
//     borderColor: '#dce5dd',
//     borderRadius: 8,
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     marginRight: 8,
//     backgroundColor: '#f8f9fc',
//   },
//   nativeDropdownText: {fontSize: 13, fontWeight: '600', color: '#252f50'},
// });

import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  getPendingApprovals,
  approveUser,
  rejectUser,
  getUsers,
  updateUserRole,
  deleteUser,
} from '../api/auth';

type UserRow = {
  id: string;
  displayName?: string;
  name?: string;
  email: string;
  role: string;
};

const ROLE_OPTIONS = ['Admin', 'Surveyor', 'QC', 'Manager', 'Client'];

const ROLE_COLORS: Record<string, {bg: string; text: string}> = {
  Admin: {bg: '#f1eaf3', text: '#8053a6'},
  Surveyor: {bg: '#e5eef7', text: '#3b68aa'},
  QC: {bg: '#fff0d7', text: '#a75a0b'},
  Manager: {bg: '#f0eeff', text: '#718be8'},
  Client: {bg: '#f0f1f6', text: '#5b6178'},
};
const roleStyle = (role: string) => ROLE_COLORS[role] ?? ROLE_COLORS.Client;

function confirmAction(message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('Are you sure?', message, [
    {text: 'Cancel', style: 'cancel'},
    {text: confirmLabel, style: 'destructive', onPress: onConfirm},
  ]);
}

type Props = {
  onBack: () => void;
};

export default function UserManagementScreen({onBack}: Props) {
  const {width} = useWindowDimensions();
  const isMobile = width < 1100;
  const [pending, setPending] = useState<UserRow[]>([]);
  const [approved, setApproved] = useState<UserRow[]>([]);
  const [rejected, setRejected] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        getPendingApprovals(),
        getUsers('Approved'),
        getUsers('Rejected'),
      ]);
      setPending(pendingRes.data);
      setApproved(approvedRes.data);
      setRejected(rejectedRes.data);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      Alert.alert('Error', 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const name = (u: UserRow) => u.displayName || u.name || u.email;

  const handleApprove = async (user: UserRow) => {
    setActioningId(user.id);
    try {
      await approveUser(user.id);
      setPending(prev => prev.filter(u => u.id !== user.id));
      setApproved(prev => [...prev, user]);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      Alert.alert('Error', 'Could not approve user');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (user: UserRow, from: 'pending' | 'approved') => {
    setActioningId(user.id);
    try {
      await rejectUser(user.id);
      if (from === 'pending') {
        setPending(prev => prev.filter(u => u.id !== user.id));
      } else {
        setApproved(prev => prev.filter(u => u.id !== user.id));
      }
      setRejected(prev => [...prev, user]);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      Alert.alert('Error', 'Could not reject user');
    } finally {
      setActioningId(null);
    }
  };

  const handleReapprove = async (user: UserRow) => {
    setActioningId(user.id);
    try {
      await approveUser(user.id);
      setRejected(prev => prev.filter(u => u.id !== user.id));
      setApproved(prev => [...prev, user]);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      Alert.alert('Error', 'Could not approve user');
    } finally {
      setActioningId(null);
    }
  };

  const handleRoleChange = async (user: UserRow, newRole: string) => {
    if (newRole === user.role) return;
    const previousRole = user.role;
    setRoleChangingId(user.id);
    setApproved(prev =>
      prev.map(u => (u.id === user.id ? {...u, role: newRole} : u)),
    );
    try {
      await updateUserRole(user.id, newRole);
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      setApproved(prev =>
        prev.map(u => (u.id === user.id ? {...u, role: previousRole} : u)),
      );
      Alert.alert('Error', 'Could not change role');
    } finally {
      setRoleChangingId(null);
    }
  };

  const handleDelete = (user: UserRow) => {
    confirmAction(
      `Delete ${name(user)}? Are you sure ?`,
      'Delete',
      async () => {
        setActioningId(user.id);
        try {
          const response = await deleteUser(user.id);
          await loadAll();
          Alert.alert(
            'User deleted',
            response.data?.message || 'User was permanently deleted.',
          );
        } catch (err: any) {
          console.error(err?.response?.data || err.message);
          const data = err?.response?.data;
          const dependencies = Array.isArray(data?.dependencies)
            ? `\n\nRelated records: ${data.dependencies.join(', ')}`
            : '';
          Alert.alert(
            'Could not delete user',
            `${data?.error || err.message || 'The delete request failed.'}${dependencies}`,
          );
        } finally {
          setActioningId(null);
        }
      },
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#718be8" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View>
          <Text style={[styles.title, isMobile && styles.titleMobile]}>Manage User Registrations</Text>
          <Text style={styles.subtitle}>Approve, reject, and manage roles for app users</Text>
        </View>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, isMobile && styles.backBtnMobile]}>
          <Text style={styles.backBtnText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>

      <UserTable
        title="Pending Approvals"
        countBadge={pending.length}
        columns={['Username', 'Email', 'Requested Role', 'Action']}
        emptyText="No pending approvals"
        rows={pending}
        isMobile={isMobile}
        renderMobileRow={user => (
          <MobileUserCard user={user} name={name(user)}>
            <RoleChip role={user.role} />
            <View style={styles.mobileActions}>
              <PillButton
                label="Approve"
                variant="approve"
                loading={actioningId === user.id}
                onPress={() => handleApprove(user)}
              />
              <PillButton
                label="Reject"
                variant="reject"
                disabled={actioningId === user.id}
                onPress={() => handleReject(user, 'pending')}
              />
            </View>
          </MobileUserCard>
        )}
        renderRow={user => (
          <>
            <Cell flex={1.1} bold>{name(user)}</Cell>
            <Cell flex={1.6} muted>{user.email}</Cell>
            <Cell flex={1.3}>
              <RoleChip role={user.role} />
            </Cell>
            <View style={[styles.colAction, styles.actionCell]}>
              <PillButton
                label="Approve"
                variant="approve"
                loading={actioningId === user.id}
                onPress={() => handleApprove(user)}
              />
              <PillButton
                label="Reject"
                variant="reject"
                disabled={actioningId === user.id}
                onPress={() => handleReject(user, 'pending')}
              />
            </View>
          </>
        )}
      />

      <UserTable
        title="Approved Users"
        countBadge={approved.length}
        columns={['Username', 'Email', 'Current Role', 'Manage']}
        emptyText="No approved users yet"
        rows={approved}
        wideAction
        isMobile={isMobile}
        renderMobileRow={user => (
          <MobileUserCard user={user} name={name(user)}>
            <View style={styles.mobileRoleActions}>
              <RoleChip role={user.role} />
              <RoleDropdown
                value={user.role}
                disabled={roleChangingId === user.id}
                onChange={role => handleRoleChange(user, role)}
              />
            </View>
            {roleChangingId === user.id && <ActivityIndicator color="#8fa7f8" size="small" />}
            <View style={styles.mobileActions}>
              <PillButton
                label="Delete"
                variant="reject"
                disabled={actioningId === user.id}
                loading={actioningId === user.id}
                onPress={() => handleDelete(user)}
              />
            </View>
          </MobileUserCard>
        )}
        renderRow={user => (
          <>
            <Cell flex={1.1} bold>{name(user)}</Cell>
            <Cell flex={1.6} muted>{user.email}</Cell>
            <Cell flex={1.3}>
              <RoleChip role={user.role} />
            </Cell>
            <View style={[styles.colChangeRole, styles.actionCell]}>
              <RoleDropdown
                value={user.role}
                disabled={roleChangingId === user.id}
                onChange={role => handleRoleChange(user, role)}
              />
              {roleChangingId === user.id && (
                <ActivityIndicator color="#8fa7f8" size="small" />
              )}
              <PillButton
                label="Delete"
                variant="reject"
                disabled={actioningId === user.id}
                loading={actioningId === user.id}
                onPress={() => handleDelete(user)}
              />
            </View>
          </>
        )}
      />

      <UserTable
        title="Rejected Users"
        countBadge={rejected.length}
        columns={['Username', 'Email', 'Requested Role', 'Action']}
        emptyText="No rejected users"
        rows={rejected}
        isMobile={isMobile}
        renderMobileRow={user => (
          <MobileUserCard user={user} name={name(user)}>
            <RoleChip role={user.role} />
            <View style={styles.mobileActions}>
              <PillButton
                label="Approve"
                variant="approve"
                disabled={actioningId === user.id}
                loading={actioningId === user.id}
                onPress={() => handleReapprove(user)}
              />
              <PillButton
                label="Delete"
                variant="reject"
                disabled={actioningId === user.id}
                loading={actioningId === user.id}
                onPress={() => handleDelete(user)}
              />
            </View>
          </MobileUserCard>
        )}
        renderRow={user => (
          <>
            <Cell flex={1.1} bold>{name(user)}</Cell>
            <Cell flex={1.6} muted>{user.email}</Cell>
            <Cell flex={1.3}>
              <RoleChip role={user.role} />
            </Cell>
            <View style={[styles.colAction, styles.actionCell]}>
              <PillButton
                label="Approve"
                variant="approve"
                disabled={actioningId === user.id}
                loading={actioningId === user.id}
                onPress={() => handleReapprove(user)}
              />
              <PillButton
                label="Delete"
                variant="reject"
                disabled={actioningId === user.id}
                loading={actioningId === user.id}
                onPress={() => handleDelete(user)}
              />
            </View>
          </>
        )}
      />
    </ScrollView>
  );
}


function UserTable({
  title,
  countBadge,
  columns,
  rows,
  emptyText,
  renderRow,
  isMobile,
  renderMobileRow,
  wideAction,
}: {
  title: string;
  countBadge: number;
  columns: string[];
  rows: UserRow[];
  emptyText: string;
  renderRow: (user: UserRow) => React.ReactNode;
  isMobile: boolean;
  renderMobileRow?: (user: UserRow) => React.ReactNode;
  wideAction?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{countBadge}</Text>
        </View>
      </View>

      <View style={[styles.table, isMobile && styles.tableMobile]}>
        {!isMobile && (
          <View style={styles.headerRow}>
            <Text style={[styles.th, styles.colUsername]}>{columns[0]}</Text>
            <Text style={[styles.th, styles.colEmail]}>{columns[1]}</Text>
            <Text style={[styles.th, styles.colRole]}>{columns[2]}</Text>
            <Text style={[styles.th, wideAction ? styles.colChangeRole : styles.colAction]}>
              {columns[3]}
            </Text>
          </View>
        )}

        {rows.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : (
          rows.map((user, idx) => isMobile ? (
            <View key={user.id}>
              {renderMobileRow ? renderMobileRow(user) : renderRow(user)}
            </View>
          ) : (
            <View key={user.id} style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
              {renderRow(user)}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function MobileUserCard({
  user,
  name,
  children,
}: {
  user: UserRow;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.mobileUserCard}>
      <View style={styles.mobileIdentity}>
        <View style={styles.mobileAvatar}>
          <Text style={styles.mobileAvatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.mobileUserCopy}>
          <Text style={styles.mobileUserName} numberOfLines={1}>{name}</Text>
          <Text style={styles.mobileUserEmail} numberOfLines={2}>{user.email}</Text>
        </View>
      </View>
      <View style={styles.mobileCardControls}>{children}</View>
    </View>
  );
}

function Cell({
  children,
  flex,
  bold,
  muted,
}: {
  children: React.ReactNode;
  flex: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <Text
      style={[
        styles.td,
        {flex},
        bold && styles.tdBold,
        muted && styles.tdMuted,
      ]}
      numberOfLines={1}>
      {children}
    </Text>
  );
}

function RoleChip({role}: {role: string}) {
  const c = roleStyle(role);
  return (
    <View style={[styles.chip, {backgroundColor: c.bg}]}>
      <Text style={[styles.chipText, {color: c.text}]}>{role}</Text>
    </View>
  );
}

function PillButton({
  label,
  variant,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  variant: 'approve' | 'reject';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.pillBtn,
        variant === 'approve' ? styles.approveBtn : styles.rejectBtn,
        disabled && styles.pillBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}>
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.pillBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function RoleDropdown({value, onChange, disabled}: {value: string; onChange: (r: string) => void; disabled?: boolean}) {
  const matchedOption =
    ROLE_OPTIONS.find(r => r.toLowerCase() === value.toLowerCase()) || ROLE_OPTIONS[0];

  if (Platform.OS === 'web') {
    return (
      // @ts-ignore
      <select
        value={matchedOption}
        disabled={disabled}
        onChange={(e: any) => onChange(e.target.value)}
        style={selectStyleWeb}>
        {ROLE_OPTIONS.map(role => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    );
  }
  return (
    <TouchableOpacity
      style={styles.nativeDropdown}
      disabled={disabled}
      onPress={() => {
        const next =
          ROLE_OPTIONS[(ROLE_OPTIONS.indexOf(matchedOption) + 1) % ROLE_OPTIONS.length];
        onChange(next);
      }}>
      <Text style={styles.nativeDropdownText}>{matchedOption} ▾</Text>
    </TouchableOpacity>
  );
}

const selectStyleWeb: any = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1.5px solid #dce5dd',
  fontSize: 13,
  fontWeight: 600,
  color: '#252f50',
  backgroundColor: '#f8f9fc',
  maxWidth: '100%',
  marginRight: 0,
  outline: 'none',
};

// ---------- Styles (matching DashboardScreen / Sidebar design language) ----------

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f7f9ff'},
  loadingScreen: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f9ff'},
  content: {padding: 28, minHeight: '100%' as any},
  contentMobile: {padding: 14, paddingBottom: 28},

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerMobile: {flexDirection: 'column', alignItems: 'stretch', gap: 14, marginBottom: 22},
  title: {fontSize: 22, fontWeight: '800', color: '#252f50'},
  titleMobile: {fontSize: 20, lineHeight: 26},
  subtitle: {fontSize: 13, color: '#8a8fa3', marginTop: 4},
  backBtn: {
    backgroundColor: '#f0eeff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtnMobile: {alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 9},
  backBtnText: {color: '#8fa7f8', fontSize: 13, fontWeight: '700'},

  section: {marginBottom: 26},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {fontSize: 16, fontWeight: '800', color: '#252f50'},
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#f0eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {fontSize: 11.5, fontWeight: '800', color: '#8fa7f8'},

  table: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      web: {boxShadow: '0px 4px 18px rgba(19, 42, 36, 0.06)'},
      default: {
        shadowColor: '#718be8',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
      },
    }),
  },
  tableMobile: {backgroundColor: 'transparent', borderRadius: 0, overflow: 'visible', boxShadow: 'none' as any, elevation: 0},
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fc',
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  th: {fontSize: 12, fontWeight: '700', color: '#5b6178', letterSpacing: 0.3},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: '#f0f1f6',
  },
  rowAlt: {backgroundColor: '#fafbfd'},
  mobileUserCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e9f6',
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({web: {boxShadow: '0 3px 12px rgba(36, 45, 82, 0.05)'}, default: {elevation: 1}}),
  },
  mobileIdentity: {flexDirection: 'row', alignItems: 'center', gap: 10},
  mobileAvatar: {width: 38, height: 38, borderRadius: 19, backgroundColor: '#f0eeff', alignItems: 'center', justifyContent: 'center'},
  mobileAvatarText: {fontSize: 15, fontWeight: '800', color: '#718be8'},
  mobileUserCopy: {flex: 1, minWidth: 0},
  mobileUserName: {fontSize: 14, color: '#252f50', fontWeight: '800'},
  mobileUserEmail: {fontSize: 11, color: '#8a8fa3', marginTop: 3},
  mobileCardControls: {borderTopWidth: 1, borderTopColor: '#f0f1f6', marginTop: 12, paddingTop: 11, gap: 10},
  mobileRoleActions: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'},
  mobileActions: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  td: {fontSize: 13.5, color: '#2a2d3b'},
  tdBold: {fontWeight: '700', color: '#252f50'},
  tdMuted: {color: '#8a8fa3'},
  colUsername: {flex: 1.1},
  colEmail: {flex: 1.6},
  colRole: {flex: 1.3},
  colAction: {flex: 1.4},
  colChangeRole: {flex: 2},

  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: {fontSize: 11.5, fontWeight: '700'},

  actionCell: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  emptyRow: {paddingVertical: 26, alignItems: 'center'},
  emptyText: {fontSize: 13, color: '#9aa0b4'},

  pillBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  pillBtnDisabled: {opacity: 0.6},
  approveBtn: {backgroundColor: '#718be8'},
  rejectBtn: {backgroundColor: '#ba4e3c'},
  pillBtnText: {color: '#fff', fontSize: 12.5, fontWeight: '700'},

  nativeDropdown: {
    borderWidth: 1.5,
    borderColor: '#dce5dd',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#f8f9fc',
  },
  nativeDropdownText: {fontSize: 13, fontWeight: '600', color: '#252f50'},
});
