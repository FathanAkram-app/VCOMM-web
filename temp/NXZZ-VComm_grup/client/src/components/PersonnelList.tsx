import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { UsersIcon, User, Shield, MapPin, FileText, BadgeCheck, Clipboard } from 'lucide-react';
import { getAuthData } from "../lib/authUtils";

interface Personnel {
  id: number;
  username: string;
  isOnline: boolean;
  deviceInfo?: string;
  nrp?: string;
  rank?: string;
  unit?: string;
  branch?: string;
  station?: string;
  bloodType?: string;
  securityClearance?: string;
  emergencyContact?: string;
}

export default function PersonnelList() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = async () => {
    setLoading(true);
    try {
      // Get local auth data for authentication header
      const userData = getAuthData();

      // First check localStorage for cached data
      const storedPersonnel = localStorage.getItem('personnel_data');
      if (storedPersonnel) {
        setPersonnel(JSON.parse(storedPersonnel));
        setLoading(false);
      }

      // Fetch from new API endpoint that correctly returns JSON
      const response = await fetch('/api/all-users', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(userData ? { 'Authorization': `Bearer ${userData.id}` } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Process personnel data
        const enhancedData = data.map((person: any) => {
          // Parse deviceInfo for additional fields if available
          let nrp, rank, unit, branch, station, bloodType, securityClearance, emergencyContact;
          
          if (person.deviceInfo) {
            const deviceInfo = person.deviceInfo;
            
            // Extract NRP
            const nrpMatch = deviceInfo.match(/NRP:\s*([^;|]+)/i);
            nrp = nrpMatch ? nrpMatch[1].trim() : undefined;
            
            // Extract rank if present
            const rankMatch = deviceInfo.match(/Rank:\s*([^;|]+)/i);
            rank = rankMatch ? rankMatch[1].trim() : undefined;
            
            // Extract unit if present
            const unitMatch = deviceInfo.match(/Unit:\s*([^;|]+)/i);
            unit = unitMatch ? unitMatch[1].trim() : undefined;
            
            // Extract branch if present
            const branchMatch = deviceInfo.match(/Branch:\s*([^;|]+)/i);
            branch = branchMatch ? branchMatch[1].trim() : undefined;
            
            // Extract station if present
            const stationMatch = deviceInfo.match(/Station:\s*([^;|]+)/i);
            station = stationMatch ? stationMatch[1].trim() : undefined;
            
            // Extract blood type if present
            const bloodTypeMatch = deviceInfo.match(/Blood Type:\s*([^;|]+)/i);
            bloodType = bloodTypeMatch ? bloodTypeMatch[1].trim() : undefined;
            
            // Extract security clearance if present
            const securityClearanceMatch = deviceInfo.match(/Security Clearance:\s*([^;|]+)/i);
            securityClearance = securityClearanceMatch ? securityClearanceMatch[1].trim() : undefined;
            
            // Extract emergency contact if present
            const emergencyContactMatch = deviceInfo.match(/Emergency Contact:\s*([^;|]+)/i);
            emergencyContact = emergencyContactMatch ? emergencyContactMatch[1].trim() : undefined;
          }
          
          return {
            ...person,
            nrp,
            rank,
            unit,
            branch,
            station,
            bloodType,
            securityClearance,
            emergencyContact
          };
        });
        
        // Update state and localStorage
        setPersonnel(enhancedData);
        localStorage.setItem('personnel_data', JSON.stringify(enhancedData));
        setLoading(false);
      } else {
        console.error('Failed to fetch personnel data from API');
      }
    } catch (error) {
      console.error('Error fetching personnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPerson = (person: Personnel) => {
    setSelectedPerson(person);
  };

  // Get background color based on unit/branch
  const getBranchColor = (branch?: string) => {
    if (!branch) return 'bg-[#3d5a65]';
    const branchLower = branch.toLowerCase();
    
    if (branchLower.includes('special force')) return 'bg-[#4a5d3f]';
    if (branchLower.includes('army')) return 'bg-[#4e5340]';
    if (branchLower.includes('navy')) return 'bg-[#344e6b]';
    if (branchLower.includes('air force')) return 'bg-[#3e548e]';
    if (branchLower.includes('marine')) return 'bg-[#4c4035]';
    if (branchLower.includes('intel')) return 'bg-[#5b4166]';
    return 'bg-[#3d5a65]';
  };

  // Get icon for each rank level
  const getRankIcon = (rank?: string) => {
    if (!rank) return <User size={16} />;
    const rankLower = rank.toLowerCase();
    
    if (rankLower.includes('colonel') || rankLower.includes('general')) {
      return <Shield size={16} />;
    }
    if (rankLower.includes('captain') || rankLower.includes('major')) {
      return <BadgeCheck size={16} />;
    }
    if (rankLower.includes('sergeant')) {
      return <Clipboard size={16} />;
    }
    return <User size={16} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8d9c6b] mx-auto"></div>
          <p className="mt-4 text-[#8d9c6b]">Loading personnel data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212]">
      <div className="bg-[#1e1e1e] p-3 border-b border-[#333]">
        <h2 className="text-[#e0e0e0] font-semibold flex items-center">
          <UsersIcon className="h-5 w-5 mr-2 text-[#8d9c6b]" />
          Personnel Directory
        </h2>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Personnel list */}
        <div className="w-full md:w-1/3 border-r border-[#333] overflow-y-auto">
          {personnel.length > 0 ? (
            <div className="grid grid-cols-1 gap-px bg-[#2a2a2a]">
              {personnel.map((person) => (
                <div
                  key={person.id}
                  className={`p-4 cursor-pointer bg-[#1e1e1e] hover:bg-[#292929] transition-colors ${selectedPerson?.id === person.id ? 'bg-[#292929]' : ''}`}
                  onClick={() => handleSelectPerson(person)}
                >
                  <div className="flex items-center">
                    <div className={`relative w-10 h-10 rounded-full ${getBranchColor(person.branch)} flex items-center justify-center text-white font-semibold mr-3`}>
                      {person.username.substring(0, 2).toUpperCase()}
                      {person.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1e1e1e]"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium text-[#e0e0e0] truncate">
                          {person.username}
                        </h3>
                        <span className="text-xs text-[#8d9c6b] ml-2">
                          {person.nrp || 'NRP: -'}
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <span className="inline-flex items-center text-xs text-[#bdc1c0] bg-[#2a2a2a] px-2 py-0.5 rounded">
                          {getRankIcon(person.rank)}
                          <span className="ml-1">{person.rank || 'Rank not specified'}</span>
                        </span>
                        {person.branch && (
                          <span className="text-xs text-[#bdc1c0] ml-2 truncate">
                            {person.branch}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <UsersIcon className="h-12 w-12 text-[#566c57] mb-4" />
              <p className="text-[#bdc1c0] mb-2">No personnel records found</p>
              <p className="text-[#bdc1c0]/70 text-sm">Check your connection to the database</p>
            </div>
          )}
        </div>
        
        {/* Personnel details */}
        {selectedPerson ? (
          <div className="hidden md:block md:w-2/3 p-4 overflow-y-auto">
            <div className="bg-[#1e1e1e] rounded-lg p-5 shadow-md">
              <div className="flex items-center mb-6">
                <div className={`w-16 h-16 rounded-full ${getBranchColor(selectedPerson.branch)} flex items-center justify-center text-white text-xl font-bold`}>
                  {selectedPerson.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="ml-4">
                  <h2 className="text-xl font-semibold text-[#e0e0e0]">{selectedPerson.username}</h2>
                  <div className="flex items-center">
                    <span className={`inline-flex h-2 w-2 rounded-full ${selectedPerson.isOnline ? 'bg-green-500' : 'bg-gray-500'} mr-2`}></span>
                    <span className="text-sm text-[#bdc1c0]">{selectedPerson.isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-[#8d9c6b] font-semibold flex items-center mb-3">
                    <FileText size={16} className="mr-2" />
                    Personal Information
                  </h3>
                  <div className="bg-[#2a2a2a] rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Personnel ID</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">NRP</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.nrp || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Rank</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.rank || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Blood Type</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.bloodType || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Emergency Contact</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.emergencyContact || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-[#8d9c6b] font-semibold flex items-center mb-3">
                    <MapPin size={16} className="mr-2" />
                    Assignment Information
                  </h3>
                  <div className="bg-[#2a2a2a] rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Branch</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.branch || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Unit</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.unit || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Station</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.station || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Security Clearance</p>
                      <p className="text-sm text-[#e0e0e0]">{selectedPerson.securityClearance || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#bdc1c0]">Device Information</p>
                      <p className="text-sm text-[#e0e0e0] truncate" title={selectedPerson.deviceInfo}>
                        {selectedPerson.deviceInfo || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#8d9c6b] text-[#8d9c6b] hover:bg-[#2a2a2a]"
                  onClick={() => {
                    if (selectedPerson) {
                      // Navigate to chat with this person
                      window.location.href = `/chat/${selectedPerson.id}`;
                    }
                  }}
                >
                  Start Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#8d9c6b] text-[#8d9c6b] hover:bg-[#2a2a2a]"
                >
                  View Service Record
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex md:w-2/3 items-center justify-center">
            <div className="text-center">
              <UsersIcon className="h-16 w-16 text-[#333] mx-auto mb-4" />
              <p className="text-[#bdc1c0]">Select a personnel record to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}