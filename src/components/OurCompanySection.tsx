import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {Company, getCompanies} from '../api/companies';
import AuthenticatedImage from './AuthenticatedImage';
import {getApiErrorMessage} from '../api/errors';
export const matchingCompanies = (companies: Company[], search: string) => companies.filter(company => `${company.companyName} ${company.displayName}`.toLowerCase().includes(search.trim().toLowerCase()));
export default function OurCompanySection({value, onChange, existing, inputStyle}: {value?: string | null; onChange?: (id: string | null) => void; existing?: Company | null; inputStyle?: any}) {
  const [companies, setCompanies] = useState<Company[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [search, setSearch] = useState(''); const [open, setOpen] = useState(false); const editable = !!onChange;
  const load = () => {setLoading(true); setError(''); return getCompanies().then(response => setCompanies(response.data)).catch(err => setError(getApiErrorMessage(err, 'Could not load companies.'))).finally(() => setLoading(false));};
  useEffect(() => {if (editable) void load();}, [editable]);
  const selected = companies.find(company => company.id === value) || (existing?.id === value ? existing : null);
  return <View style={{gap: 12, marginBottom: 16}}>
    <Text testID="project-form-label" style={{fontSize: 12.5, fontWeight: '700', color: '#5b6178', textTransform: 'uppercase'}}>Company Name</Text>
    {editable ? <>
      <TextInput accessibilityLabel="Search or select company" style={inputStyle} value={open ? search : selected?.displayName || ''} placeholder="Search or select company" onFocus={() => {setSearch(''); setOpen(true);}} onPressIn={() => {if (!open) {setSearch(''); setOpen(true);}}} onChangeText={text => {setSearch(text); setOpen(true);}} autoCapitalize="none" />
      {loading && <ActivityIndicator color="#8fa7f8" />}
      {!!error && <View><Text accessibilityRole="alert" style={{color: '#ba4e3c'}}>{error}</Text><TouchableOpacity onPress={() => {void load();}}><Text>Retry</Text></TouchableOpacity></View>}
      {open && !loading && !error && <ScrollView keyboardShouldPersistTaps="handled" style={{maxHeight: 200, borderWidth: 1, borderColor: '#e5e9f6', borderRadius: 8}}>
        {matchingCompanies(companies, search).map(company => <TouchableOpacity accessibilityRole="button" key={company.id} onPress={() => {onChange?.(company.id); setOpen(false); setSearch('');}} style={{padding: 12}}><Text style={{color: '#242d52'}}>{company.displayName}</Text></TouchableOpacity>)}
        {matchingCompanies(companies, search).length === 0 && <Text style={{padding: 12, color: '#85899a'}}>No companies found</Text>}
      </ScrollView>}
      {!!value && <TouchableOpacity onPress={() => {onChange?.(null); setOpen(false); setSearch('');}}><Text style={{color: '#718be8'}}>Clear company selection</Text></TouchableOpacity>}
    </> : <Text style={{color: '#242d52'}}>{selected?.displayName || '-'}</Text>}
    {selected && <Text style={{fontWeight: '700', color: '#242d52'}}>{selected.companyName}</Text>}
    {([['Company Email', selected?.email], ['Company Address', selected?.address], ['Telephone', selected?.telephone], ['Fax', selected?.fax], ['Website', selected?.website]] as const).map(([label, text]) => <View key={label}><Text testID="project-form-label" style={{fontSize: 12.5, fontWeight: '700', color: '#5b6178', marginBottom: 6, textTransform: 'uppercase'}}>{label}</Text><Text style={{color: '#242d52'}}>{text || '-'}</Text></View>)}
    <Text testID="project-form-label" style={{fontSize: 12.5, fontWeight: '700', color: '#5b6178', textTransform: 'uppercase'}}>Company Logo</Text>
    {selected?.logoUrl ? <AuthenticatedImage path={selected.logoUrl} resizeMode="contain" placeholderText="No logo available" style={{width: 180, height: 90}} /> : <Text style={{color: '#85899a'}}>No logo available</Text>}
  </View>;
}
