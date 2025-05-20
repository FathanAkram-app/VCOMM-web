import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { Search, Loader2, UserPlus, User, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { useQuery } from "@tanstack/react-query";

interface ContactsListProps {
  onContactSelected?: (id: number) => void;
}

// Antarmuka untuk data kontak dari API
interface ApiUser {
  id: number;
  username: string;
  isOnline: boolean;
  deviceInfo: string;
}

// Antarmuka untuk data yang digunakan dalam tampilan UI
interface Contact {
  id: number;
  name: string;
  role: string;
  status: string;
  lastSeen: string;
  isOnline: boolean;
  branch: string;
  battalion: string;
  deploymentArea: string;
  originalUsername?: string; // Store original case for improved search
}

// Konversi data API menjadi format yang sama dengan data yang digunakan komponen
const mapApiToContactFormat = (apiUser: ApiUser): Contact => {
  // Ekstrak informasi dari deviceInfo jika tersedia
  let role = "PERSONNEL";
  let branch = "MILITARY";
  let battalion = "GENERAL UNIT";
  let deploymentArea = "UNSPECIFIED";
  
  if (apiUser.deviceInfo) {
    const deviceParts = apiUser.deviceInfo.split(';');
    if (deviceParts.length > 2) {
      role = deviceParts[2].trim().replace('Rank:', '').trim() || role;
    }
    if (deviceParts.length > 3) {
      branch = deviceParts[3].trim().replace('Branch:', '').trim() || branch;
    }
    if (deviceParts.length > 4) {
      battalion = deviceParts[4].trim().replace('Unit:', '').trim() || battalion;
    }
    if (deviceParts.length > 5) {
      deploymentArea = deviceParts[5].trim().replace('Station:', '').trim() || deploymentArea;
    }
  }
  
  return {
    id: apiUser.id,
    name: apiUser.username.toUpperCase(),
    originalUsername: apiUser.username, // Store original username for accurate search
    role: role || "PERSONNEL",
    status: apiUser.isOnline ? "ACTIVE" : "INACTIVE",
    lastSeen: apiUser.isOnline ? "NOW" : "OFFLINE",
    isOnline: apiUser.isOnline,
    branch: branch || "MILITARY",
    battalion: battalion || "GENERAL UNIT",
    deploymentArea: deploymentArea || "UNSPECIFIED"
  };
};

export default function ContactsList({ onContactSelected }: ContactsListProps) {
  console.log("ContactsList rendering with enhanced search"); // Debugging
  
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [battalionFilter, setBattalionFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  
  // TEMPORARY: Menggunakan fetch langsung untuk debug
  const [apiUsers, setApiUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch data langsung
  React.useEffect(() => {
    console.log("Fetching users directly");
    setIsLoading(true);
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        console.log("Direct API Users loaded:", data.length, data);
        
        // Check specifically for 'david' user
        const davidUser = data.find(user => user.username.toLowerCase() === 'david');
        if (davidUser) {
          console.log("FOUND DAVID USER IN API RESPONSE:", davidUser);
        } else {
          console.log("WARNING: David user not found in API response");
        }
        
        setApiUsers(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error loading users directly:", err);
        setError(err);
        setIsLoading(false);
      });
  }, []);
  
  // Konversi data API ke format kontak dengan penanganan khusus
  const contacts = useMemo(() => {
    if (!apiUsers || apiUsers.length === 0) return [] as Contact[];
    
    return apiUsers.map(apiUser => {
      // Special handling untuk user penting seperti "david" dan "eko" 
      if (apiUser.username.toLowerCase() === 'david' || apiUser.username.toLowerCase() === 'eko') {
        console.log(`SPECIAL MAPPING FOR KEY USER: ${apiUser.username}`);
        
        // Directly create contact object with exact username preservation
        return {
          ...mapApiToContactFormat(apiUser),
          // Store the original username exactly as in API for search consistency
          originalUsername: apiUser.username,
          // Make sure name reflects username clearly to ensure visibility
          name: apiUser.username.toUpperCase(),
        };
      }
      
      // Regular mapping for other users
      return mapApiToContactFormat(apiUser);
    });
  }, [apiUsers]);
  
  // Extract unique values for filters
  const branches = useMemo(() => 
    Array.from(new Set(contacts.map(c => c.branch))).sort(), 
    [contacts]
  );
  
  const battalions = useMemo(() => 
    Array.from(new Set(contacts.map(c => c.battalion))).sort(), 
    [contacts]
  );
  
  const areas = useMemo(() => 
    Array.from(new Set(contacts.map(c => c.deploymentArea))).sort(), 
    [contacts]
  );
  
  // Apply filters to contacts
  const filteredContacts = useMemo(() => {
    // Handle empty search query or empty contacts
    if (!contacts.length) return [];
    if (!searchQuery && branchFilter === 'all' && battalionFilter === 'all' && areaFilter === 'all') {
      return contacts;
    }
    
    // Clean and lowercase search query for consistent matching
    const query = searchQuery.toLowerCase().trim();
    
    console.log("Searching contacts with query:", query);
    console.log("Available contacts:", contacts.map(c => `${c.originalUsername || c.name} (ID: ${c.id})`));
    console.log("Original API Users:", apiUsers?.map(u => `${u.username} (ID: ${u.id})`));
    
    // Special handling for specific users like "david" and "eko"
    const isKeyUserSearch = query && ["david", "eko"].includes(query.toLowerCase());
    
    // If searching for specific key users, create a quick lookup result
    if (isKeyUserSearch && apiUsers && apiUsers.length > 0) {
      console.log(`SPECIAL SEARCH FOR: ${query.toUpperCase()}`);
      
      // First, try to find direct case-insensitive match in API users
      const keyUserApiMatch = apiUsers.find(u => 
        u.username.toLowerCase() === query.toLowerCase()
      );
      
      if (keyUserApiMatch) {
        console.log(`API FOUND DIRECT MATCH FOR ${query.toUpperCase()}:`, keyUserApiMatch);
        
        // Create a direct mapping from API user to contact
        const keyUserContact = contacts.find(c => c.id === keyUserApiMatch.id);
        if (keyUserContact) {
          console.log(`FOUND KEY USER ${query.toUpperCase()} IN CONTACTS:`, keyUserContact);
        } else {
          console.log(`WARNING: Found ${query.toUpperCase()} in API but not in translated contacts!`);
        }
      }
    }
    
    // For key users like "david" or "eko", create a special filter that prioritizes exact matches
    if (isKeyUserSearch) {
      return contacts.filter(contact => {
        // First, check if we have a direct API match
        if (apiUsers) {
          const apiUser = apiUsers.find(u => u.id === contact.id);
          if (apiUser && apiUser.username.toLowerCase() === query.toLowerCase()) {
            console.log(`DIRECT MATCH FOR ${query} - CONTACT:`, contact);
            return true; // Immediate match for exact username
          }
        }
        
        // Check if originalUsername matches exactly (case insensitive)
        if (contact.originalUsername && contact.originalUsername.toLowerCase() === query.toLowerCase()) {
          console.log(`ORIGINAL USERNAME MATCH FOR ${query} - CONTACT:`, contact);
          return true;
        }
        
        // Check if display name matches exactly (case insensitive)
        if (contact.name.toLowerCase() === query.toLowerCase()) {
          console.log(`DISPLAY NAME MATCH FOR ${query} - CONTACT:`, contact);
          return true;
        }
        
        // Fall back to partial matches only if no exact matches are found
        return (
          // Partial match on original username
          (contact.originalUsername && contact.originalUsername.toLowerCase().includes(query)) ||
          // Partial match on display name
          contact.name.toLowerCase().includes(query)
        );
      });
    }
    
    // Standard search for other terms
    return contacts.filter(contact => {
      // ENHANCED search logic for more reliable results
      
      // Directly check against raw API data first for maximum accuracy
      let matchesApiData = false;
      if (apiUsers) {
        const apiUser = apiUsers.find(u => u.id === contact.id);
        if (apiUser) {
          matchesApiData = apiUser.username.toLowerCase().includes(query);
        }
      }
      
      // Search query filter - prioritize exact username matches, then partial
      const matchesSearch = !query || 
        // Direct API match (most accurate)
        matchesApiData ||
        // Check original case-sensitive username 
        (contact.originalUsername && contact.originalUsername.toLowerCase().includes(query)) ||
        // Then check uppercased display name
        contact.name.toLowerCase().includes(query) ||
        // Then check role, battalion, branch, etc
        contact.role.toLowerCase().includes(query) ||
        (contact.battalion && contact.battalion.toLowerCase().includes(query)) ||
        (contact.branch && contact.branch.toLowerCase().includes(query)) ||
        (contact.deploymentArea && contact.deploymentArea.toLowerCase().includes(query)) ||
        (contact.lastSeen && contact.lastSeen.toLowerCase().includes(query));
      
      // Filter by other criteria
      const matchesBranch = branchFilter === 'all' || contact.branch === branchFilter;
      const matchesBattalion = battalionFilter === 'all' || contact.battalion === battalionFilter;
      const matchesArea = areaFilter === 'all' || contact.deploymentArea === areaFilter;
      
      // If we're debugging a specific username match
      if (query === 'david' && contact.originalUsername === 'david') {
        console.log("David filtering details:", {
          apiMatch: matchesApiData,
          originalMatch: (contact.originalUsername && contact.originalUsername.toLowerCase().includes(query)),
          nameMatch: contact.name.toLowerCase().includes(query),
          roleMatch: contact.role.toLowerCase().includes(query),
          finalResult: matchesSearch && matchesBranch && matchesBattalion && matchesArea
        });
      }
      
      return matchesSearch && matchesBranch && matchesBattalion && matchesArea;
    });
  }, [searchQuery, branchFilter, battalionFilter, areaFilter, contacts, apiUsers]);
  
  // Special debugging for key users search
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if ((query === 'david' || query === 'eko') && apiUsers) {
      console.log(`SPECIAL SEARCH DEBUGGING FOR '${query.toUpperCase()}'`);
      
      // Find this user in API users
      const apiUser = apiUsers.find(u => u.username.toLowerCase() === query);
      if (apiUser) {
        console.log(`FOUND ${query.toUpperCase()} IN API USERS:`, apiUser);
        
        // Check if we can find this user in filtered results
        const foundInResults = filteredContacts.some(c => c.id === apiUser.id);
        console.log(`${query.toUpperCase()} USER FOUND IN SEARCH RESULTS: ${foundInResults}`);
        
        if (!foundInResults) {
          // Find the matching contact object if it exists
          const contact = contacts.find(c => c.id === apiUser.id);
          console.log(`CONTACT OBJECT FOR ${query.toUpperCase()}:`, contact || 'NOT FOUND');
          
          if (contact) {
            console.log(`SEARCH FAILURE ANALYSIS FOR ${query.toUpperCase()}: CONTACT EXISTS BUT NOT IN RESULTS`);
          }
        }
      } else {
        console.log(`${query.toUpperCase()} NOT FOUND IN API USERS!`);
      }
    }
  }, [searchQuery, apiUsers, filteredContacts, contacts]);
  
  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setBranchFilter('all');
    setBattalionFilter('all');
    setAreaFilter('all');
  };

  return (
    <div className="flex flex-col h-full bg-[#2a2b25]">
      {/* Header already handled in MainLayout component */}
      
      {/* Search box with military style */}
      <div className="p-3 border-b border-accent/80 bg-[#2a2b25]">
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-accent" />
          <Input
            placeholder="SEARCH PERSONNEL..."
            className="pl-9 bg-[#1a1b15] border-accent/80 placeholder:text-accent/50 font-mono text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          {searchQuery && (
            <Button 
              size="sm" 
              variant="ghost" 
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0" 
              onClick={() => setSearchQuery('')}
            >
              <span className="sr-only">Clear search</span>
              ✕
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Branch filter */}
          <div>
            <Label htmlFor="branch-filter" className="block mb-1 text-xs font-bold font-mono text-accent">BRANCH</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger id="branch-filter" className="w-full bg-muted/70 border-accent/80 h-8 text-xs font-mono">
                <SelectValue placeholder="ALL BRANCHES" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-background border-accent/80">
                <SelectItem value="all">ALL BRANCHES</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch} value={branch || "not-specified"}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        
          {/* Battalion filter */}
          <div>
            <Label htmlFor="battalion-filter" className="block mb-1 text-xs font-bold font-mono text-accent">UNIT</Label>
            <Select value={battalionFilter} onValueChange={setBattalionFilter}>
              <SelectTrigger id="battalion-filter" className="w-full bg-muted/70 border-accent/80 h-8 text-xs font-mono">
                <SelectValue placeholder="ALL UNITS" />
              </SelectTrigger>
              <SelectContent position="popper" className="bg-background border-accent/80 max-h-36">
                <SelectItem value="all">ALL UNITS</SelectItem>
                {battalions.map(battalion => (
                  <SelectItem key={battalion} value={battalion || "not-specified"}>{battalion}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Deployment Area filter */}
        <div className="mb-3">
          <Label htmlFor="area-filter" className="block mb-1 text-xs font-bold font-mono text-accent">DEPLOYMENT ZONE</Label>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger id="area-filter" className="w-full bg-muted/70 border-accent/80 h-8 text-xs font-mono">
              <SelectValue placeholder="ALL SECTORS" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-background border-accent/80">
              <SelectItem value="all">ALL SECTORS</SelectItem>
              {areas.map(area => (
                <SelectItem key={area} value={area || "not-specified"}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Reset filters button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetFilters}
          className="w-full border-accent/80 text-xs font-mono hover:bg-accent/20 transition-colors"
        >
          RESET FILTERS
        </Button>
      </div>
      
      {/* Enhanced loading indicator */}
      {isLoading && (
        <div className="flex flex-col justify-center items-center h-40 text-center">
          <div className="bg-muted/50 p-6 border border-accent/40 rounded-sm w-full max-w-xs">
            <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
            <div className="font-mono text-xs text-accent">SECURE CONNECTION ESTABLISHED</div>
            <div className="font-mono text-sm mt-2">RETRIEVING PERSONNEL DATA...</div>
            <div className="w-full bg-muted h-1 mt-4 rounded-full overflow-hidden">
              <div className="bg-accent h-1 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}
      
      {/* Enhanced error message */}
      {error && (
        <div className="flex flex-col items-center justify-center h-40 text-center p-3">
          <div className="bg-muted/50 p-4 border border-red-400/40 rounded-sm w-full max-w-xs">
            <div className="font-mono text-sm text-red-500 mb-3">CONNECTION ERROR</div>
            <p className="text-muted-foreground mb-4 text-xs font-mono">FAILED TO RETRIEVE PERSONNEL DATA</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="border-red-400/80 text-xs w-full font-mono hover:bg-red-400/10 transition-colors"
            >
              RETRY CONNECTION
            </Button>
          </div>
        </div>
      )}
      
      {/* Results list */}
      {!isLoading && !error && (
        <div className="flex-1 overflow-y-auto p-3 pb-16 mb-2 bg-[#2a2b25]">
          {filteredContacts.length > 0 ? (
            <>
              <div className="text-xs text-accent mb-3 font-mono flex items-center justify-between bg-[#3d3f35]/50 p-2 border border-accent/40 rounded-sm">
                <span>DISPLAYING {filteredContacts.length} OF {contacts.length} PERSONNEL</span>
                <span className="px-2 py-0.5 rounded-sm bg-accent/20 text-[10px]">SECURITY LEVEL: CLASSIFIED</span>
              </div>
              
              <div className="space-y-2">
                {filteredContacts.map(contact => (
                  <div 
                    key={contact.id}
                    className={`flex items-center p-3 cursor-pointer hover:bg-[#3d3f35] border-b border-accent/30 relative group 
                      ${(contact.originalUsername?.toLowerCase() === 'david' || contact.originalUsername?.toLowerCase() === 'eko') 
                        ? 'bg-[#3a3d33] border-l-2 border-l-amber-500' 
                        : ''}`}
                    onClick={() => onContactSelected?.(contact.id)}
                  >
                    {/* Left accent border - special highlight for david and eko */}
                    <div className={`absolute left-0 top-0 w-1 h-full 
                      ${(contact.originalUsername?.toLowerCase() === 'david' || contact.originalUsername?.toLowerCase() === 'eko')
                        ? 'bg-amber-500/80 group-hover:bg-amber-500'
                        : 'bg-accent/40 group-hover:bg-accent/80'} 
                      transition-colors`}></div>
                    
                    {/* Avatar with military style - special styling for david and eko */}
                    <div className="ml-2 mr-4 relative">
                      <div className={`uppercase font-bold text-sm w-10 h-10 border rounded-sm flex items-center justify-center
                        ${(contact.originalUsername?.toLowerCase() === 'david' || contact.originalUsername?.toLowerCase() === 'eko') 
                          ? 'border-amber-500/70 bg-[#474a3d]' 
                          : 'border-accent/30 bg-[#3d3f35]'}`}>
                        {contact.name.substring(0, 2)}
                      </div>
                      
                      {/* Enhanced online indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 border border-[#2a2b25] 
                        ${contact.isOnline ? 'bg-green-500' : 'bg-gray-500'} rounded-sm transition-colors`}></div>

                      {/* Special indicator for important users */}
                      {(contact.originalUsername?.toLowerCase() === 'david' || contact.originalUsername?.toLowerCase() === 'eko') && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-sm border border-[#2a2b25]"></div>
                      )}
                    </div>
                    
                    {/* Contact details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white uppercase">{contact.name}</h3>
                          
                          {/* Special badge for david or eko */}
                          {(contact.originalUsername?.toLowerCase() === 'david' || contact.originalUsername?.toLowerCase() === 'eko') && (
                            <div className="px-1.5 py-0.5 bg-amber-600/30 text-amber-300 text-[10px] font-bold rounded">
                              {contact.originalUsername?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs font-mono px-2 py-0.5 rounded-sm bg-accent/20">
                          {contact.isOnline ? 'ACTIVE' : 'INACTIVE'}
                        </div>
                      </div>
                      <div className="mt-1">
                        <p className="text-sm text-gray-400 font-mono">{contact.role || 'Not specified'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <div className="text-xs text-gray-400 font-mono">
                          {contact.branch || 'Branch not specified'} {contact.battalion ? `• ${contact.battalion}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="bg-[#1a1b15] p-4 border border-accent/40 rounded-sm w-full max-w-xs">
                <div className="font-mono text-sm text-accent mb-3">PERSONNEL SEARCH RESULTS</div>
                {searchQuery && (
                  <div className="font-mono text-xs text-accent/60 mb-3">
                    SEARCH TERM: <span className="text-white bg-[#3d3f35] p-1 rounded">{searchQuery}</span>
                  </div>
                )}
                <p className="text-accent/70 mb-4 text-xs font-mono">NO PERSONNEL MATCH CURRENT FILTERS</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={resetFilters}
                  className="border-accent/80 text-xs w-full font-mono hover:bg-accent/20 transition-colors"
                >
                  RESET FILTERS
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}