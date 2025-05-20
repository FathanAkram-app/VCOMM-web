import React, { useState, useMemo } from "react";
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
import { Search, Loader2 } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [battalionFilter, setBattalionFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  
  // Mengambil data pengguna dari API
  const { data: apiUsers, isLoading, error } = useQuery<ApiUser[]>({
    queryKey: ['/api/users'],
    refetchInterval: 30000, // Refresh data setiap 30 detik
  });
  
  // Konversi data API ke format kontak
  const contacts = useMemo(() => {
    if (!apiUsers || apiUsers.length === 0) return [] as Contact[];
    
    return apiUsers.map(mapApiToContactFormat);
  }, [apiUsers]);
  
  // Extract unique values for filters
  const branches = useMemo(() => 
    Array.from(new Set(contacts.map((c: Contact) => c.branch))).sort(), 
    [contacts]
  );
  
  const battalions = useMemo(() => 
    Array.from(new Set(contacts.map((c: Contact) => c.battalion))).sort(), 
    [contacts]
  );
  
  const areas = useMemo(() => 
    Array.from(new Set(contacts.map((c: Contact) => c.deploymentArea))).sort(), 
    [contacts]
  );
  
  // Apply filters to contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact: Contact) => {
      // Search query filter
      const matchesSearch = !searchQuery || 
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.role.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Other filters
      const matchesBranch = !branchFilter || contact.branch === branchFilter;
      const matchesBattalion = !battalionFilter || contact.battalion === battalionFilter;
      const matchesArea = !areaFilter || contact.deploymentArea === areaFilter;
      
      return matchesSearch && matchesBranch && matchesBattalion && matchesArea;
    });
  }, [searchQuery, branchFilter, battalionFilter, areaFilter, contacts]);
  
  // Reset all filters
  const resetFilters = () => {
    setBranchFilter('');
    setBattalionFilter('');
    setAreaFilter('');
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search box */}
      <div className="p-3 border-b border-accent">
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="SEARCH PERSONNEL"
            className="pl-9 bg-muted/50 border-accent"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Branch filter */}
        <div className="mb-3">
          <Label htmlFor="branch-filter" className="block mb-1 text-xs font-bold">BRANCH OF SERVICE</Label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger id="branch-filter" className="w-full bg-muted/50 border-accent">
              <SelectValue placeholder="ALL BRANCHES" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-background border-accent">
              <SelectItem value="">ALL BRANCHES</SelectItem>
              {branches.map((branch: string) => (
                <SelectItem key={branch} value={branch}>{branch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Battalion filter */}
        <div className="mb-3">
          <Label htmlFor="battalion-filter" className="block mb-1 text-xs font-bold">BATTALION / UNIT</Label>
          <Select value={battalionFilter} onValueChange={setBattalionFilter}>
            <SelectTrigger id="battalion-filter" className="w-full bg-muted/50 border-accent">
              <SelectValue placeholder="ALL UNITS" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-background border-accent">
              <SelectItem value="">ALL UNITS</SelectItem>
              {battalions.map((battalion: string) => (
                <SelectItem key={battalion} value={battalion}>{battalion}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Deployment Area filter */}
        <div className="mb-3">
          <Label htmlFor="area-filter" className="block mb-1 text-xs font-bold">DEPLOYMENT AREA</Label>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger id="area-filter" className="w-full bg-muted/50 border-accent">
              <SelectValue placeholder="ALL SECTORS" />
            </SelectTrigger>
            <SelectContent position="popper" className="bg-background border-accent">
              <SelectItem value="">ALL SECTORS</SelectItem>
              {areas.map((area: string) => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Reset filters button */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetFilters}
          className="w-full border-accent"
        >
          RESET FILTERS
        </Button>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading personnel data...</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="flex flex-col items-center justify-center h-40 text-center p-3">
          <p className="text-red-500 mb-2">Failed to load personnel data</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.location.reload()}
            className="border-accent"
          >
            RETRY
          </Button>
        </div>
      )}
      
      {/* Results list */}
      {!isLoading && !error && (
        <div className="flex-1 overflow-y-auto p-3">
          {filteredContacts.length > 0 ? (
            <>
              <div className="text-xs text-muted-foreground mb-3 font-mono">
                DISPLAYING {filteredContacts.length} OF {contacts.length} PERSONNEL
              </div>
              
              <div className="space-y-2">
                {filteredContacts.map((contact: Contact) => (
                <div 
                  key={contact.id}
                  className="flex items-center p-3 rounded-sm cursor-pointer bg-muted/30 hover:bg-accent/20 transition-all border border-accent/30"
                  onClick={() => onContactSelected?.(contact.id)}
                >
                  {/* Avatar */}
                  <div className="mr-3 relative">
                    <div className="w-12 h-12 rounded-sm bg-primary text-primary-foreground flex items-center justify-center border border-accent">
                      <span className="font-bold">{contact.name.substring(0, 2)}</span>
                    </div>
                    
                    {/* Online indicator */}
                    {contact.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                    )}
                  </div>
                  
                  {/* Contact details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold truncate">{contact.name}</h3>
                      <span className="text-xs text-muted-foreground">{contact.lastSeen}</span>
                    </div>
                    <div className="flex items-center mb-1">
                      <p className="text-sm text-muted-foreground truncate mr-2">{contact.role}</p>
                      <Badge variant={contact.isOnline ? 'default' : 'outline'} className="text-xs px-1 py-0 h-4">
                        {contact.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {contact.branch}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {contact.battalion}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {contact.deploymentArea}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <p className="text-muted-foreground mb-2">NO PERSONNEL MATCH CURRENT FILTERS</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetFilters}
              className="border-accent"
            >
              RESET FILTERS
            </Button>
          </div>
        )}
      </div>
    )}
  </div>
  );
}