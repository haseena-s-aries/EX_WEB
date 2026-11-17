import {useSessionProfile} from '../api/profileState';
import {useUserAccessCounts,refreshUserAccess,subscribeUserAccess} from '../api/userAccess';
import RoleRequestReview from '../components/RoleRequestReview';
import AccessDecisionDialog from '../components/AccessDecisionDialog';
import {getApiErrorMessage} from '../api/errors';
import {visual} from '../theme/visual';
import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Image,
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

const OFFSHORE_ART = require('../assets/landing/industry-3.jpg');

type UserRow = {
  id: string;
  displayName?: string;
  name?: string;
  email: string;
  role: string;
  registeredAt?: string;
};

const ROLE_OPTIONS = ['Admin', 'Surveyor', 'QC', 'Manager', 'Client'];

const ROLE_COLORS: Record<string, {bg: string; text: string}> = {
  Admin: {bg: '#f1eaf3', text: '#8053a6'},
  Surveyor: {bg: '#e5eef7', text: '#3b68aa'},
  QC: {bg: '#fff0d7', text: '#a75a0b'},
  Manager: {bg: '#e3eff1', text: '#718be8'},
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
  userRole?: string;
  focusUserId?: string;
  focusRequestId?: string;
  /** When set, a Log out button is shown at the bottom (used by the phone tab layout). */
  onLogout?: () => void;
};

export default function UserManagementScreen({onBack, onLogout, userRole, focusUserId, focusRequestId}: Props) {
  const session=useSessionProfile(); const role=userRole || session?.role || '';
  const admin=role.toLowerCase()==='admin'; const manager=role.toLowerCase()==='manager';
  const counts=useUserAccessCounts(admin||manager);
  const [tab,setTab]=useState<'registrations'|'roles'>(focusRequestId && admin?'roles':'registrations');
  const [rejecting,setRejecting]=useState<UserRow|null>(null); const [decisionError,setDecisionError]=useState('');
  useEffect(()=>{setTab(focusRequestId&&admin?'roles':'registrations');},[focusRequestId,focusUserId,admin]);
  const {width} = useWindowDimensions();
  const isMobile = width < 1100;
  const [pending, setPending] = useState<UserRow[]>([]);
  const [approved, setApproved] = useState<UserRow[]>([]);
  const [rejected, setRejected] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  const loadAll = useCallback(async (showLoading=false) => {
    if(showLoading)setLoading(true);
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
    void loadAll(true);
    const stop=subscribeUserAccess(()=>void loadAll()); const timer=setInterval(()=>void loadAll(),20000);
    return()=>{stop();clearInterval(timer);};
  }, [loadAll]);

  const name = (u: UserRow) => u.displayName || u.name || u.email;

  const handleApprove = async (user: UserRow) => {
    setActioningId(user.id);
    try {
      await approveUser(user.id);
      setPending(prev => prev.filter(u => u.id !== user.id));
      setApproved(prev => [...prev, user]);
      refreshUserAccess();
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      Alert.alert('Error', 'Could not approve user');
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (user: UserRow, from: 'pending' | 'approved', reason: string) => {
    setActioningId(user.id);
    try {
      await rejectUser(user.id, reason);
      if (from === 'pending') {
        setPending(prev => prev.filter(u => u.id !== user.id));
      } else {
        setApproved(prev => prev.filter(u => u.id !== user.id));
      }
      setRejected(prev => [...prev, user]); setRejecting(null); refreshUserAccess();
    } catch (err: any) {
      console.error(err?.response?.data || err.message);
      setDecisionError(getApiErrorMessage(err, 'Could not reject user'));
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
      <View nativeID="ex-user-management-loading" style={styles.loadingScreen}>
        <ActivityIndicator color="#718be8" size="large" />
      </View>
    );
  }

  return (
    <ScrollView nativeID="ex-user-management" style={styles.screen} contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}>
      <View nativeID="ex-user-management-hero" style={styles.hero}>
        <Image source={OFFSHORE_ART} resizeMode="cover" style={styles.heroPhoto} accessible={false} />
        <View nativeID="ex-operations-hero-overlay" pointerEvents="none" style={[StyleSheet.absoluteFill, Platform.OS !== 'web' && styles.heroShade]} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>WORKSPACE ACCESS  /  USERS</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>User <Text style={styles.heroAccent}>Management</Text></Text>
          <Text style={styles.heroDescription}>Approve, reject, and manage roles for app users.</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" onPress={onBack} style={[styles.backBtn, isMobile && styles.backBtnMobile]}>
          <Text style={styles.backBtnText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>

      <View style={{flexDirection:'row',gap:16,paddingVertical:12,flexWrap:'wrap'}}><TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:tab==='registrations'}} onPress={()=>setTab('registrations')}><Text style={{color:'#00D9EE',fontWeight:'800'}}>Pending Registrations ({pending.length})</Text></TouchableOpacity>{admin&&<TouchableOpacity accessibilityRole="tab" accessibilityState={{selected:tab==='roles'}} onPress={()=>setTab('roles')}><Text style={{color:'#00D9EE',fontWeight:'800'}}>Role Change Requests ({counts.pendingRoleChanges})</Text></TouchableOpacity>}<TouchableOpacity accessibilityRole="button" onPress={()=>void loadAll()}><Text style={{color:'#00D9EE'}}>Refresh</Text></TouchableOpacity></View>
      {admin&&tab==='roles'?<RoleRequestReview focusId={focusRequestId}/>:<>
      <UserTable
        title="Pending Registrations"
        countBadge={pending.length}
        columns={['Full Name', 'Email', 'Requested Role', 'Registration Date', 'Status', 'Actions']}
        emptyText="No pending approvals"
        rows={pending}
        isMobile={isMobile}
        renderMobileRow={user => (
          <MobileUserCard user={user} name={name(user)}>
            <RoleChip role={user.role} /><Text style={{color:'#B2D5E4'}}>Pending Approval · {user.registeredAt ? new Date(user.registeredAt).toLocaleString() : 'Date not recorded'}</Text>
            <View style={styles.mobileActions}>
              <PillButton
                label="Approve"
                variant="approve"
                loading={actioningId === user.id}
                onPress={() => confirmAction(`Approve ${name(user)}?`, 'Approve', () => void handleApprove(user))}
              />
              <PillButton
                label="Reject"
                variant="reject"
                disabled={actioningId === user.id}
                onPress={() => {setDecisionError('');setRejecting(user);}}
              />
            </View>
          </MobileUserCard>
        )}
        renderRow={user => (
          <>
            <Cell flex={1.1} bold>{user.id===focusUserId?'→ ':''}{name(user)}</Cell>
            <Cell flex={1.6} muted>{user.email}</Cell>
            <Cell flex={1.3}>
              <RoleChip role={user.role} />
            </Cell>
            <Cell flex={1.1} muted>{user.registeredAt ? new Date(user.registeredAt).toLocaleString() : '—'}</Cell><Cell flex={1} muted>Pending Approval</Cell>
            <View style={[styles.colAction, styles.actionCell]}>
              <PillButton
                label="Approve"
                variant="approve"
                loading={actioningId === user.id}
                onPress={() => confirmAction(`Approve ${name(user)}?`, 'Approve', () => void handleApprove(user))}
              />
              <PillButton
                label="Reject"
                variant="reject"
                disabled={actioningId === user.id}
                onPress={() => {setDecisionError('');setRejecting(user);}}
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
              <RoleDropdown options={manager ? ROLE_OPTIONS.filter(r=>!['Admin','Manager'].includes(r)) : ROLE_OPTIONS}
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
              <RoleDropdown options={manager ? ROLE_OPTIONS.filter(r=>!['Admin','Manager'].includes(r)) : ROLE_OPTIONS}
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
      </>}
      {rejecting&&<AccessDecisionDialog title={`Reject ${name(rejecting)}`} busy={!!actioningId} error={decisionError} onCancel={()=>setRejecting(null)} onConfirm={reason=>void handleReject(rejecting,'pending',reason)}/>}
      {onLogout ? (
        <TouchableOpacity accessibilityRole="button" onPress={onLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Log out</Text>
        </TouchableOpacity>
      ) : null}
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
    <View testID="user-management-section" style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{countBadge}</Text>
        </View>
      </View>

      <View testID={isMobile ? undefined : 'user-management-table'} style={[styles.table, isMobile && styles.tableMobile]}>
        {!isMobile && (
          <View testID="user-management-table-header" style={styles.headerRow}>
            <Text style={[styles.th, styles.colUsername]}>{columns[0]}</Text>
            <Text style={[styles.th, styles.colEmail]}>{columns[1]}</Text>
            <Text style={[styles.th, styles.colRole]}>{columns[2]}</Text>
            {columns.length===6&&<><Text style={[styles.th,{flex:1.1}]}>Registration Date</Text><Text style={[styles.th,{flex:1}]}>Status</Text></>}
            <Text style={[styles.th, wideAction ? styles.colChangeRole : styles.colAction]}>
              {columns[columns.length-1]}
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
            <View key={user.id} testID="user-management-row" style={[styles.row, idx % 2 === 1 && styles.rowAlt]}>
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
    <View testID="user-management-mobile-card" style={styles.mobileUserCard}>
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
    <View testID="user-management-role-chip" style={[styles.chip, {backgroundColor: c.bg}]}>
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
      testID={variant === 'approve' ? 'user-management-approve' : 'user-management-reject'}
      accessibilityRole="button"
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

function RoleDropdown({value, onChange, disabled, options=ROLE_OPTIONS}: {value: string; onChange: (r: string) => void; disabled?: boolean; options?:string[]}) {
  const matchedOption =
    options.find(r => r.toLowerCase() === value.toLowerCase()) || options[0];

  if (Platform.OS === 'web') {
    return (
      // @ts-ignore
      <select
        value={matchedOption}
        disabled={disabled}
        onChange={(e: any) => onChange(e.target.value)}
        style={selectStyleWeb}>
        {options.map(role => (
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
          options[(options.indexOf(matchedOption) + 1) % options.length];
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
  color: '#102e3b',
  backgroundColor: '#f8f9fc',
  maxWidth: '100%',
  marginRight: 0,
  outline: 'none',
};

// ---------- Styles (matching DashboardScreen / Sidebar design language) ----------

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: '#f0f6f8'},
  loadingScreen: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f6f8'},
  content: {padding: 16, paddingBottom: 32, minHeight: '100%'},
  contentMobile: {padding: 14, paddingBottom: 28},

  hero: {minHeight: 148, padding: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    marginBottom: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#126078', borderRadius: 17, backgroundColor: '#03192C'},
  heroPhoto: {position: 'absolute', right: 0, width: '76%', height: '100%'},
  heroShade: {backgroundColor: '#03192C88'},
  heroCopy: {flexGrow: 1, flexBasis: 270, minWidth: 0, gap: 5},
  heroEyebrow: {color: '#00D9EE', fontFamily: visual.mono, fontSize: 11, fontWeight: '800', letterSpacing: 1.6},
  heroTitle: {color: '#F5FAFF', fontFamily: visual.display, fontSize: 34, fontStyle: 'italic', fontWeight: '900'},
  heroAccent: {color: '#00D9EE'},
  heroDescription: {color: '#F5FAFF', fontSize: 14},
  logoutBtn: {marginTop: 24, marginBottom: 90, minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#efcdd1', backgroundColor: '#fdf0f1', alignItems: 'center', justifyContent: 'center'},
  logoutBtnText: {fontSize: 14.5, fontWeight: '800', color: '#b43242'},
  title: {fontSize: 22, fontWeight: '800', color: '#102e3b'},
  titleMobile: {fontSize: 20, lineHeight: 26},
  subtitle: {fontSize: 13, color: '#8a8fa3', marginTop: 4},
  backBtn: {
    backgroundColor: '#0A3148',
    borderWidth: 1,
    borderColor: '#126078',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtnMobile: {alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 9},
  backBtnText: {color: '#76EAF5', fontSize: 13, fontWeight: '800'},

  section: {marginBottom: 16, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#d3e1e6'},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {fontSize: 16, fontWeight: '800', color: '#102e3b'},
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: '#e3eff1',
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
    backgroundColor: visual.rail,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  th: {fontFamily: visual.mono, fontSize: 11, fontWeight: '700', color: '#e8f6f8', letterSpacing: .6},
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
    borderColor: '#d3e1e6',
    borderRadius: 13,
    padding: 14,
    marginBottom: 10,
    ...Platform.select({web: {boxShadow: '0 3px 12px rgba(36, 45, 82, 0.05)'}, default: {elevation: 1}}),
  },
  mobileIdentity: {flexDirection: 'row', alignItems: 'center', gap: 10},
  mobileAvatar: {width: 38, height: 38, borderRadius: 19, backgroundColor: '#e3eff1', alignItems: 'center', justifyContent: 'center'},
  mobileAvatarText: {fontSize: 15, fontWeight: '800', color: '#718be8'},
  mobileUserCopy: {flex: 1, minWidth: 0},
  mobileUserName: {fontSize: 14, color: '#102e3b', fontWeight: '800'},
  mobileUserEmail: {fontSize: 11, color: '#8a8fa3', marginTop: 3},
  mobileCardControls: {borderTopWidth: 1, borderTopColor: '#f0f1f6', marginTop: 12, paddingTop: 11, gap: 10},
  mobileRoleActions: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'},
  mobileActions: {flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap'},
  td: {fontSize: 13.5, color: '#2a2d3b'},
  tdBold: {fontWeight: '700', color: '#102e3b'},
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
  nativeDropdownText: {fontSize: 13, fontWeight: '600', color: '#102e3b'},
});
