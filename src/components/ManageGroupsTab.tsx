'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
}

interface InnerGroup {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    members: string[];
    createdAt: Date;
}

interface StandaloneInnerGroup {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    members: string[];
    createdAt: Date;
    description?: string;
}

interface Group {
    id: string;
    name: string;
    description: string;
    innerGroups: InnerGroup[];
    members: string[];
    createdAt: Date;
    isActive: boolean;
}

interface ManageGroupsTabProps {
    users: User[];
}

const ManageGroupsTab: React.FC<ManageGroupsTabProps> = ({ users }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showCreateInnerGroup, setShowCreateInnerGroup] = useState(false);
    const [showManageMembers, setShowManageMembers] = useState(false);
    const [showManageInnerGroup, setShowManageInnerGroup] = useState(false);
    const [showInnerGroupsTab, setShowInnerGroupsTab] = useState(false);
    const [showCreateStandaloneInnerGroup, setShowCreateStandaloneInnerGroup] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedInnerGroup, setSelectedInnerGroup] = useState<InnerGroup | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form states
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    // Inner group form states
    const [innerGroupName, setInnerGroupName] = useState('');
    const [startTime, setStartTime] = useState('13:00'); // 1 PM default
    const [endTime, setEndTime] = useState('15:00'); // 3 PM default
    const [innerGroupMembers, setInnerGroupMembers] = useState<string[]>([]);

    // Standalone inner group states
    const [standaloneInnerGroups, setStandaloneInnerGroups] = useState<StandaloneInnerGroup[]>([]);
    const [standaloneInnerGroupName, setStandaloneInnerGroupName] = useState('');
    const [standaloneInnerGroupDescription, setStandaloneInnerGroupDescription] = useState('');
    const [standaloneStartTime, setStandaloneStartTime] = useState('13:00');
    const [standaloneEndTime, setStandaloneEndTime] = useState('15:00');
    const [standaloneInnerGroupMembers, setStandaloneInnerGroupMembers] = useState<string[]>([]);
    const [addingToAllGroups, setAddingToAllGroups] = useState<string | null>(null); // Track which inner group is being added to all groups

    // Ensure users is always an array
    const safeUsers = Array.isArray(users) ? users : [];

    useEffect(() => {
        fetchGroups();
        fetchStandaloneInnerGroups();
    }, []);

    // Debug logging for member selection
    useEffect(() => {
        console.log('selectedMembers state changed:', selectedMembers);
    }, [selectedMembers]);

    useEffect(() => {
        console.log('innerGroupMembers state changed:', innerGroupMembers);
    }, [innerGroupMembers]);

    const fetchStandaloneInnerGroups = async () => {
        try {
            const response = await apiClient.getStandaloneInnerGroups();
            if (response.success) {
                const processedInnerGroups = response.innerGroups.map((innerGroup: any) => ({
                    ...innerGroup,
                    createdAt: innerGroup.createdAt instanceof Date ? innerGroup.createdAt : 
                        (innerGroup.createdAt?.toDate ? innerGroup.createdAt.toDate() : 
                            (innerGroup.createdAt ? new Date(innerGroup.createdAt) : new Date()))
                }));
                setStandaloneInnerGroups(processedInnerGroups);
            }
        } catch (error: any) {
            console.error('Error fetching standalone inner groups:', error);
        }
    };

    const fetchGroups = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.getGroups();

            if (response.success) {
                        // Convert Firestore Timestamps to Date objects for both groups and inner groups
        const processedGroups = response.groups.map((group: any) => ({
          ...group,
          createdAt: group.createdAt instanceof Date ? group.createdAt : 
            (group.createdAt?.toDate ? group.createdAt.toDate() : 
              (group.createdAt ? new Date(group.createdAt) : new Date())),
          innerGroups: group.innerGroups.map((innerGroup: any) => ({
            ...innerGroup,
            createdAt: (() => {
              
              // Handle Firestore Timestamp first
              if (innerGroup.createdAt?.toDate && typeof innerGroup.createdAt.toDate === 'function') {
                try {
                  const date = innerGroup.createdAt.toDate();
                  if (date instanceof Date && !isNaN(date.getTime())) {
                    return date;
                  }
                } catch (e) {
                  console.error('Error calling toDate():', e);
                }
              }
              
              // Handle existing Date object
              if (innerGroup.createdAt instanceof Date) {
                if (!isNaN(innerGroup.createdAt.getTime())) {
                  return innerGroup.createdAt;
                }
              }
              
              // Handle string/number timestamp
              if (innerGroup.createdAt) {
                try {
                  const date = new Date(innerGroup.createdAt);
                  if (!isNaN(date.getTime())) {
                    return date;
                  }
                } catch (e) {
                  console.error('Error creating Date from value:', e);
                }
              }
              
              // Fallback to current date
              return new Date();
            })()
          }))
        }));

                setGroups(processedGroups);
            } else {
                setError('Failed to fetch groups');
            }
        } catch (error: any) {
            console.error('Error fetching groups:', error);
            setError(error.message || 'Failed to fetch groups');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filter out any invalid user IDs
        const validSelectedMembers = selectedMembers.filter(id => id && id !== 'undefined');
        
        try {
            const response = await apiClient.createGroup({
                name: groupName,
                description: groupDescription,
                members: validSelectedMembers,
            });

            if (response.success) {
                setShowCreateGroup(false);
                setGroupName('');
                setGroupDescription('');
                setSelectedMembers([]);
                fetchGroups();
                
                // Show success message
                setSuccessMessage(`Group "${groupName}" created successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error creating group:', error);
        }
    };

    const handleCreateStandaloneInnerGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Filter out any invalid user IDs
        const validMembers = standaloneInnerGroupMembers.filter(id => id && id !== 'undefined');
        
        try {
            let response;
            
            if (selectedInnerGroup) {
                // Update existing inner group
                response = await apiClient.updateStandaloneInnerGroup(selectedInnerGroup.id, {
                    name: standaloneInnerGroupName,
                    description: standaloneInnerGroupDescription,
                    startTime: standaloneStartTime,
                    endTime: standaloneEndTime,
                    members: validMembers,
                });
            } else {
                // Create new inner group
                response = await apiClient.createStandaloneInnerGroup({
                    name: standaloneInnerGroupName,
                    description: standaloneInnerGroupDescription,
                    startTime: standaloneStartTime,
                    endTime: standaloneEndTime,
                    members: validMembers,
                });
            }

            if (response.success) {
                setShowCreateStandaloneInnerGroup(false);
                setStandaloneInnerGroupName('');
                setStandaloneInnerGroupDescription('');
                setStandaloneStartTime('13:00');
                setStandaloneEndTime('15:00');
                setStandaloneInnerGroupMembers([]);
                setSelectedInnerGroup(null);
                fetchStandaloneInnerGroups();
                
                // Show success message
                const action = selectedInnerGroup ? 'updated' : 'created';
                setSuccessMessage(`Standalone inner group "${standaloneInnerGroupName}" ${action} successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error handling standalone inner group:', error);
        }
    };

    const handleCreateInnerGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGroup) return;

        // Filter out any invalid user IDs
        const validInnerGroupMembers = innerGroupMembers.filter(id => id && id !== 'undefined');

        try {
            const response = await apiClient.createInnerGroup(selectedGroup.id, {
                name: innerGroupName,
                startTime,
                endTime,
                members: validInnerGroupMembers,
            });

            if (response.success) {
                setShowCreateInnerGroup(false);
                setInnerGroupName('');
                setStartTime('13:00');
                setEndTime('15:00');
                setInnerGroupMembers([]);
                fetchGroups();
                
                // Show success message
                setSuccessMessage(`Inner group "${innerGroupName}" created successfully in "${selectedGroup.name}"!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error creating inner group:', error);
        }
    };

    const handleAddMemberToGroup = async (groupId: string, userId: string) => {
        try {
            const response = await apiClient.addMemberToGroup(groupId, userId);
            if (response.success) {
                // Update the local state immediately instead of fetching all groups
                setGroups(prevGroups => prevGroups.map(group => {
                    if (group.id === groupId) {
                        return {
                            ...group,
                            members: [...group.members, userId]
                        };
                    }
                    return group;
                }));
                
                // Update selectedGroup if it's the current group being managed
                if (selectedGroup && selectedGroup.id === groupId) {
                    setSelectedGroup(prev => prev ? {
                        ...prev,
                        members: [...prev.members, userId]
                    } : null);
                }
                
                // Show success message
                const user = safeUsers.find(u => u.uid === userId);
                setSuccessMessage(`${user?.displayName || user?.email || 'User'} added to group successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error adding member:', error);
        }
    };

    const handleRemoveMemberFromGroup = async (groupId: string, userId: string) => {
        try {
            const response = await apiClient.removeMemberFromGroup(groupId, userId);
            if (response.success) {
                // Update the local state immediately instead of fetching all groups
                setGroups(prevGroups => prevGroups.map(group => {
                    if (group.id === groupId) {
                        return {
                            ...group,
                            members: group.members.filter(id => id !== userId)
                        };
                    }
                    return group;
                }));
                
                // Update selectedGroup if it's the current group being managed
                if (selectedGroup && selectedGroup.id === groupId) {
                    setSelectedGroup(prev => prev ? {
                        ...prev,
                        members: prev.members.filter(id => id !== userId)
                    } : null);
                }
                
                // Show success message
                const user = safeUsers.find(u => u.uid === userId);
                setSuccessMessage(`${user?.displayName || user?.email || 'User'} removed from group successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const handleRemoveMemberFromInnerGroup = async (groupId: string, innerGroupId: string, userId: string) => {
        try {
            // Update the inner group members in the group document
            const updatedGroup = groups.find(g => g.id === groupId);
            if (!updatedGroup) return;

            const updatedInnerGroups = updatedGroup.innerGroups.map(ig => {
                if (ig.id === innerGroupId) {
                    return {
                        ...ig,
                        members: ig.members.filter(memberId => memberId !== userId)
                    };
                }
                return ig;
            });

            // Update the group with modified inner groups
            const response = await apiClient.updateGroupInnerGroups(groupId, updatedInnerGroups);
            if (response.success) {
                // Update local state immediately
                setGroups(prevGroups => prevGroups.map(group => {
                    if (group.id === groupId) {
                        return {
                            ...group,
                            innerGroups: updatedInnerGroups
                        };
                    }
                    return group;
                }));
                
                // Update selectedInnerGroup if it's the current inner group being managed
                if (selectedInnerGroup && selectedInnerGroup.id === innerGroupId) {
                    setSelectedInnerGroup(prev => prev ? {
                        ...prev,
                        members: prev.members.filter(id => id !== userId)
                    } : null);
                }
                
                // Show success message
                const user = safeUsers.find(u => u.uid === userId);
                const innerGroup = updatedInnerGroups.find(ig => ig.id === innerGroupId);
                setSuccessMessage(`${user?.displayName || user?.email || 'User'} removed from inner group "${innerGroup?.name}" successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error removing member from inner group:', error);
        }
    };

    const handleAddStandaloneInnerGroupToGroup = async (groupId: string, standaloneInnerGroup: StandaloneInnerGroup) => {
        try {
            // Find the target group
            const targetGroup = groups.find(g => g.id === groupId);
            if (!targetGroup) return;

            // Create a new inner group instance for this group
            const newInnerGroup: InnerGroup = {
                id: `${standaloneInnerGroup.id}_${Date.now()}`, // Generate unique ID
                name: standaloneInnerGroup.name,
                startTime: standaloneInnerGroup.startTime,
                endTime: standaloneInnerGroup.endTime,
                members: standaloneInnerGroup.members,
                createdAt: new Date()
            };

            // Add the inner group to the group
            const updatedInnerGroups = [...targetGroup.innerGroups, newInnerGroup];
            const response = await apiClient.updateGroupInnerGroups(groupId, updatedInnerGroups);
            
            if (response.success) {
                // Update local state immediately
                setGroups(prevGroups => prevGroups.map(group => {
                    if (group.id === groupId) {
                        return {
                            ...group,
                            innerGroups: updatedInnerGroups
                        };
                    }
                    return group;
                }));
                
                // Show success message
                setSuccessMessage(`Inner group "${standaloneInnerGroup.name}" added to "${targetGroup.name}" successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error adding standalone inner group to group:', error);
        }
    };

    const handleAddToAllGroups = async (standaloneInnerGroup: StandaloneInnerGroup) => {
        try {
            // Show confirmation dialog
            if (!confirm(`Are you sure you want to add "${standaloneInnerGroup.name}" to ALL ${groups.length} groups? This action cannot be undone.`)) {
                return;
            }

            // Set loading state
            setAddingToAllGroups(standaloneInnerGroup.id);

            let successCount = 0;
            let errorCount = 0;
            const errors: string[] = [];

            // Process each group
            for (const group of groups) {
                try {
                    // Check if already added to this group
                    const isAlreadyAdded = group.innerGroups.some(ig => 
                        ig.name === standaloneInnerGroup.name && 
                        ig.startTime === standaloneInnerGroup.startTime && 
                        ig.endTime === standaloneInnerGroup.endTime
                    );

                    if (isAlreadyAdded) {
                        continue; // Skip if already added
                    }

                    // Create a new inner group instance for this group
                    const newInnerGroup: InnerGroup = {
                        id: `${standaloneInnerGroup.id}_${Date.now()}_${group.id}`, // Generate unique ID
                        name: standaloneInnerGroup.name,
                        startTime: standaloneInnerGroup.startTime,
                        endTime: standaloneInnerGroup.endTime,
                        members: standaloneInnerGroup.members,
                        createdAt: new Date()
                    };

                    // Add the inner group to the group
                    const updatedInnerGroups = [...group.innerGroups, newInnerGroup];
                    const response = await apiClient.updateGroupInnerGroups(group.id, updatedInnerGroups);
                    
                    if (response.success) {
                        successCount++;
                    } else {
                        errorCount++;
                        errors.push(`Failed to add to ${group.name}`);
                    }
                } catch (error) {
                    errorCount++;
                    errors.push(`Error adding to ${group.name}: ${error}`);
                }
            }

            // Update local state for all groups that were successfully updated
            if (successCount > 0) {
                setGroups(prevGroups => prevGroups.map(group => {
                    // Check if this group was successfully updated
                    const wasUpdated = !group.innerGroups.some(ig => 
                        ig.name === standaloneInnerGroup.name && 
                        ig.startTime === standaloneInnerGroup.startTime && 
                        ig.endTime === standaloneInnerGroup.endTime
                    );

                    if (wasUpdated) {
                        // Add the inner group to this group
                        const newInnerGroup: InnerGroup = {
                            id: `${standaloneInnerGroup.id}_${Date.now()}_${group.id}`,
                            name: standaloneInnerGroup.name,
                            startTime: standaloneInnerGroup.startTime,
                            endTime: standaloneInnerGroup.endTime,
                            members: standaloneInnerGroup.members,
                            createdAt: new Date()
                        };
                        return {
                            ...group,
                            innerGroups: [...group.innerGroups, newInnerGroup]
                        };
                    }
                    return group;
                }));
            }

            // Show success/error message
            if (successCount > 0 && errorCount === 0) {
                setSuccessMessage(`Inner group "${standaloneInnerGroup.name}" added to all ${successCount} groups successfully!`);
            } else if (successCount > 0 && errorCount > 0) {
                setSuccessMessage(`Inner group "${standaloneInnerGroup.name}" added to ${successCount} groups, but failed to add to ${errorCount} groups.`);
            } else {
                setSuccessMessage(`Failed to add inner group "${standaloneInnerGroup.name}" to any groups.`);
            }
            
            setTimeout(() => setSuccessMessage(null), 5000);

            // Log errors for debugging
            if (errors.length > 0) {
                console.error('Errors while adding to all groups:', errors);
            }

        } catch (error) {
            console.error('Error adding standalone inner group to all groups:', error);
            setSuccessMessage(`Error: Failed to add inner group to all groups. Please try again.`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } finally {
            // Clear loading state
            setAddingToAllGroups(null);
        }
    };

    const handleAddMemberToInnerGroup = async (groupId: string, innerGroupId: string, userId: string) => {
        try {
            // Update the inner group members in the group document
            const updatedGroup = groups.find(g => g.id === groupId);
            if (!updatedGroup) return;

            const updatedInnerGroups = updatedGroup.innerGroups.map(ig => {
                if (ig.id === innerGroupId) {
                    return {
                        ...ig,
                        members: [...ig.members, userId]
                    };
                }
                return ig;
            });

            // Update the group with modified inner groups
            const response = await apiClient.updateGroupInnerGroups(groupId, updatedInnerGroups);
            if (response.success) {
                // Update local state immediately
                setGroups(prevGroups => prevGroups.map(group => {
                    if (group.id === groupId) {
                        return {
                            ...group,
                            innerGroups: updatedInnerGroups
                        };
                    }
                    return group;
                }));
                
                // Update selectedInnerGroup if it's the current inner group being managed
                if (selectedInnerGroup && selectedInnerGroup.id === innerGroupId) {
                    setSelectedInnerGroup(prev => prev ? {
                        ...prev,
                        members: [...prev.members, userId]
                    } : null);
                }
                
                // Show success message
                const user = safeUsers.find(u => u.uid === userId);
                const innerGroup = updatedInnerGroups.find(ig => ig.id === innerGroupId);
                setSuccessMessage(`${user?.displayName || user?.email || 'User'} added to inner group "${innerGroup?.name}" successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error adding member to inner group:', error);
        }
    };

    const handleUpdateInnerGroup = async () => {
        try {
            if (!selectedGroup || !selectedInnerGroup) return;

            // Update the inner group in the group document
            const updatedGroup = groups.find(g => g.id === selectedGroup.id);
            if (!updatedGroup) return;

            const updatedInnerGroups = updatedGroup.innerGroups.map(ig => {
                if (ig.id === selectedInnerGroup.id) {
                    return {
                        ...ig,
                        name: selectedInnerGroup.name,
                        startTime: selectedInnerGroup.startTime,
                        endTime: selectedInnerGroup.endTime
                    };
                }
                return ig;
            });

            // Update the group with modified inner groups
            const response = await apiClient.updateGroupInnerGroups(selectedGroup.id, updatedInnerGroups);
            if (response.success) {
                // Update local state immediately
                setGroups(prevGroups => prevGroups.map(group => {
                    if (group.id === selectedGroup.id) {
                        return {
                            ...group,
                            innerGroups: updatedInnerGroups
                        };
                    }
                    return group;
                }));
                
                // Show success message
                setSuccessMessage(`Inner group "${selectedInnerGroup.name}" updated successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
                
                // Close modal
                setShowManageInnerGroup(false);
            }
        } catch (error) {
            console.error('Error updating inner group:', error);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await apiClient.deleteGroup(groupId);
            if (response.success) {
                // Get group name before removing for success message
                const deletedGroup = groups.find(g => g.id === groupId);
                
                // Remove the group from local state immediately
                setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
                
                // Show success message
                setSuccessMessage(`Group "${deletedGroup?.name || 'Unknown'}" deleted successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    };

    const handleDeleteStandaloneInnerGroup = async (innerGroupId: string) => {
        if (!confirm('Are you sure you want to delete this standalone inner group? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await apiClient.deleteStandaloneInnerGroup(innerGroupId);
            if (response.success) {
                // Get inner group name before removing for success message
                const deletedInnerGroup = standaloneInnerGroups.find(ig => ig.id === innerGroupId);
                
                // Remove the inner group from local state immediately
                setStandaloneInnerGroups(prev => prev.filter(ig => ig.id !== innerGroupId));
                
                // Show success message
                setSuccessMessage(`Standalone inner group "${deletedInnerGroup?.name || 'Unknown'}" deleted successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error deleting standalone inner group:', error);
        }
    };

    const handleDeleteInnerGroup = async (groupId: string, innerGroupId: string) => {
        if (!confirm('Are you sure you want to delete this inner group? This action cannot be undone.')) {
            return;
        }

        try {
            // Update the group by removing the inner group
            const updatedGroup = groups.find(g => g.id === groupId);
            if (!updatedGroup) return;

            const innerGroupToDelete = updatedGroup.innerGroups.find(ig => ig.id === innerGroupId);
            const updatedInnerGroups = updatedGroup.innerGroups.filter(ig => ig.id !== innerGroupId);

            // Update the group with modified inner groups
            const response = await apiClient.updateGroupInnerGroups(groupId, updatedInnerGroups);
            if (response.success) {
                // Update local state immediately
                setGroups(prevGroups => prevGroups.map(group => {
                    if (group.id === groupId) {
                        return {
                            ...group,
                            innerGroups: updatedInnerGroups
                        };
                    }
                    return group;
                }));
                
                // Show success message
                setSuccessMessage(`Inner group "${innerGroupToDelete?.name || 'Unknown'}" deleted successfully!`);
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (error) {
            console.error('Error deleting inner group:', error);
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const getUserById = (userId: string) => {
        return safeUsers.find(user => user.uid === userId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading groups...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Group Management</h2>
                        <p className="text-gray-600 mt-2">Create and manage groups with time-based messaging restrictions</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowInnerGroupsTab(!showInnerGroupsTab)}
                            className={`px-6 py-3 rounded-xl font-medium shadow-lg transition-all duration-200 flex items-center space-x-2 ${
                                showInnerGroupsTab 
                                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white' 
                                    : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800'
                            }`}
                        >
                            <span className="text-lg">🔧</span>
                            <span>{showInnerGroupsTab ? 'Hide Inner Groups' : 'Manage Inner Groups'}</span>
                        </button>
                        <button
                            onClick={() => {
                                console.log('Opening Create Group modal');
                                setSelectedMembers([]); // Reset selection
                                setGroupName(''); // Reset form
                                setGroupDescription(''); // Reset form
                                setShowCreateGroup(true);
                            }}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                        >
                            <span className="text-lg">➕</span>
                            <span>Create Group</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-8 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 text-lg">⚠️</span>
                            </div>
                            <div>
                                <h3 className="text-red-800 font-medium">Error Loading Groups</h3>
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setError(null);
                                fetchGroups();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Success Message Display */}
            {successMessage && (
                <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 text-lg">✅</span>
                            </div>
                            <div>
                                <h3 className="text-green-800 font-medium">Success!</h3>
                                <p className="text-green-600 text-sm">{successMessage}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSuccessMessage(null)}
                            className="text-green-600 hover:text-green-800 transition-colors duration-200"
                        >
                            <span className="text-xl">×</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Inner Groups Tab */}
            {showInnerGroupsTab && (
                <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">Inner Groups Management</h3>
                            <p className="text-gray-600 mt-1">Create reusable inner groups that can be added to any group</p>
                        </div>
                        <button
                            onClick={() => {
                                setStandaloneInnerGroupName('');
                                setStandaloneInnerGroupDescription('');
                                setStandaloneStartTime('13:00');
                                setStandaloneEndTime('15:00');
                                setStandaloneInnerGroupMembers([]);
                                setSelectedInnerGroup(null);
                                setShowCreateStandaloneInnerGroup(true);
                            }}
                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
                        >
                            <span className="text-lg">➕</span>
                            <span>Create Inner Group</span>
                        </button>
                    </div>

                    {/* Standalone Inner Groups Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {standaloneInnerGroups.map((innerGroup) => (
                            <div key={innerGroup.id} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">IG</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                                            Reusable
                                        </span>
                                        <button
                                            onClick={() => {
                                                setStandaloneInnerGroupName(innerGroup.name);
                                                setStandaloneInnerGroupDescription(innerGroup.description || '');
                                                setStandaloneStartTime(innerGroup.startTime);
                                                setStandaloneEndTime(innerGroup.endTime);
                                                setStandaloneInnerGroupMembers([...innerGroup.members]);
                                                setSelectedInnerGroup(innerGroup);
                                                setShowCreateStandaloneInnerGroup(true);
                                            }}
                                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors duration-200"
                                            title="Edit Inner Group"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteStandaloneInnerGroup(innerGroup.id)}
                                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors duration-200"
                                            title="Delete Inner Group"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                
                                <h4 className="text-lg font-semibold text-gray-900 mb-2">{innerGroup.name}</h4>
                                {innerGroup.description && (
                                    <p className="text-sm text-gray-600 mb-3">{innerGroup.description}</p>
                                )}
                                
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                                        <p className="text-lg font-bold text-green-600">{formatTime(innerGroup.startTime)}</p>
                                        <p className="text-xs text-green-600 font-medium">Start</p>
                                    </div>
                                    <div className="text-center p-2 bg-white rounded-lg border border-green-200">
                                        <p className="text-lg font-bold text-green-600">{formatTime(innerGroup.endTime)}</p>
                                        <p className="text-xs text-green-600 font-medium">End</p>
                                    </div>
                                </div>
                                
                                <div className="text-center p-2 bg-white rounded-lg border border-green-200 mb-4">
                                    <p className="text-lg font-bold text-green-600">{innerGroup.members.length}</p>
                                    <p className="text-xs text-green-600 font-medium">Members</p>
                                </div>

                                {/* Add to Groups Section */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <h5 className="text-sm font-medium text-gray-700">Add to Groups:</h5>
                                            <span className="text-xs text-gray-500">
                                                ({groups.filter(group => 
                                                    group.innerGroups.some(ig => 
                                                        ig.name === innerGroup.name && 
                                                        ig.startTime === innerGroup.startTime && 
                                                        ig.endTime === innerGroup.endTime
                                                    )
                                                ).length} of {groups.length} groups)
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleAddToAllGroups(innerGroup)}
                                            disabled={addingToAllGroups === innerGroup.id}
                                            className={`text-xs px-2 py-1 rounded transition-colors duration-200 ${
                                                addingToAllGroups === innerGroup.id
                                                    ? 'bg-blue-400 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            } text-white`}
                                            title="Add this inner group to all groups at once"
                                        >
                                            {addingToAllGroups === innerGroup.id ? (
                                                <span className="flex items-center space-x-1">
                                                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    <span>Adding...</span>
                                                </span>
                                            ) : (
                                                'Add to All Groups'
                                            )}
                                        </button>
                                    </div>
                                    <div className="max-h-32 overflow-y-auto space-y-2">
                                        {groups.map((group) => {
                                            // Check if this inner group is already added to this group
                                            const isAlreadyAdded = group.innerGroups.some(ig => 
                                                ig.name === innerGroup.name && 
                                                ig.startTime === innerGroup.startTime && 
                                                ig.endTime === innerGroup.endTime
                                            );
                                            
                                            return (
                                                <button
                                                    key={group.id}
                                                    onClick={() => handleAddStandaloneInnerGroupToGroup(group.id, innerGroup)}
                                                    disabled={isAlreadyAdded}
                                                    className={`w-full text-left p-2 border rounded-lg transition-colors duration-200 ${
                                                        isAlreadyAdded 
                                                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                                                            : 'bg-white hover:bg-green-50 border-green-200'
                                                    }`}
                                                    title={isAlreadyAdded ? `Already added to ${group.name}` : `Add to ${group.name}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm font-medium ${
                                                            isAlreadyAdded ? 'text-gray-500' : 'text-gray-900'
                                                        }`}>{group.name}</span>
                                                        <span className={`text-xs ${
                                                            isAlreadyAdded ? 'text-gray-400' : 'text-green-600'
                                                        }`}>
                                                            {isAlreadyAdded ? '✓ Added' : '+ Add'}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State for Inner Groups */}
                    {standaloneInnerGroups.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-green-400 text-6xl mb-4">🔧</div>
                            <h3 className="text-xl font-medium text-gray-900 mb-2">No inner groups created yet</h3>
                            <p className="text-gray-500 mb-6">Create reusable inner groups that can be added to multiple groups</p>
                            <button
                                onClick={() => {
                                    setStandaloneInnerGroupName('');
                                    setStandaloneInnerGroupDescription('');
                                    setStandaloneStartTime('13:00');
                                    setStandaloneEndTime('15:00');
                                    setStandaloneInnerGroupMembers([]);
                                    setSelectedInnerGroup(null);
                                    setShowCreateStandaloneInnerGroup(true);
                                }}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                                Create Your First Inner Group
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Groups Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {groups.map((group) => (
                    <div key={group.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                        {/* Group Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                        <span className="text-white font-bold text-lg">G</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                                        <p className="text-sm text-gray-600">{group.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${group.isActive
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                        }`}>
                                        {group.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <button
                                        onClick={() => handleDeleteGroup(group.id)}
                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                        title="Delete Group"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Group Content */}
                        <div className="p-6">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-600">{group.innerGroups.length}</p>
                                    <p className="text-xs text-blue-600 font-medium">Inner Groups</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <p className="text-2xl font-bold text-green-600">{group.members.length}</p>
                                    <p className="text-xs text-green-600 font-medium">Members</p>
                                </div>
                            </div>

                            {/* Inner Groups */}
                            {group.innerGroups.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Inner Groups</h4>
                                    <div className="space-y-2">
                                        {group.innerGroups.map((innerGroup) => (
                                            <div key={innerGroup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-gray-900">{innerGroup.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatTime(innerGroup.startTime)} - {formatTime(innerGroup.endTime)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedGroup(group);
                                                            setSelectedInnerGroup(innerGroup);
                                                            setShowManageInnerGroup(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                                                    >
                                                        Manage
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteInnerGroup(group.id, innerGroup.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors duration-200"
                                                        title="Delete Inner Group"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        setInnerGroupMembers([]); // Reset selection
                                        setInnerGroupName(''); // Reset form
                                        setStartTime('13:00'); // Reset time
                                        setEndTime('15:00'); // Reset time
                                        setSelectedGroup(group);
                                        setShowCreateInnerGroup(true);
                                    }}
                                    className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                    Add Inner Group
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedGroup(group);
                                        setShowManageMembers(true);
                                    }}
                                    className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                    Manage Members
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {groups.length === 0 && (
                <div className="text-center py-16">
                    <div className="text-gray-400 text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-medium text-gray-900 mb-2">No groups created yet</h3>
                    <p className="text-gray-500 mb-6">Start by creating your first group to organize users</p>
                    <button
                        onClick={() => setShowCreateGroup(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                        Create Your First Group
                    </button>
                </div>
            )}

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 bg-black/80 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-8 border w-11/12 max-w-2xl shadow-2xl rounded-2xl bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Create New Group</h3>
                                    <p className="text-gray-600 mt-1">Set up a new group with inner groups and time restrictions</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateGroup(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <form onSubmit={handleCreateGroup} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                                    <input
                                        type="text"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder="Enter group name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                    <textarea
                                        value={groupDescription}
                                        onChange={(e) => setGroupDescription(e.target.value)}
                                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder="Enter group description"
                                        rows={3}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Members</label>
                                    
                                    {/* Select All Button */}
                                    <div className="mb-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                console.log('Select All button clicked. Current state:', selectedMembers);
                                                const validUsers = safeUsers.filter(user => user.uid);
                                                if (selectedMembers.length === validUsers.length) {
                                                    // If all are selected, deselect all
                                                    console.log('Deselecting all users');
                                                    setSelectedMembers([]);
                                                } else {
                                                    // If not all are selected, select all
                                                    console.log('Selecting all users');
                                                    setSelectedMembers(validUsers.map(user => user.uid));
                                                }
                                            }}
                                            className="text-sm px-3 py-1 border text-black border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            {selectedMembers.length === safeUsers.filter(user => user.uid).length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <span className="ml-2 text-xs text-black">
                                            {selectedMembers.length} of {safeUsers.filter(user => user.uid).length} selected
                                        </span>
                                    </div>
                                    
                                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-xl p-3 space-y-2" key={`group-checkboxes-${showCreateGroup}`}>
                                        {safeUsers.filter(user => user.uid).map((user) => {
                                            const isSelected = selectedMembers.includes(user.uid);
                                            return (
                                                <label key={`group-${user.uid}`} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        id={`checkbox-group-${user.uid}`}
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                        console.log('Checkbox changed for user:', user.uid, 'Checked:', e.target.checked);
                                                        if (e.target.checked) {
                                                            setSelectedMembers(prev => {
                                                                const newState = [...prev, user.uid];
                                                                console.log('Adding user, new state:', newState);
                                                                return newState;
                                                            });
                                                        } else {
                                                            setSelectedMembers(prev => {
                                                                const newState = prev.filter(id => id !== user.uid);
                                                                console.log('Removing user, new state:', newState);
                                                                return newState;
                                                            });
                                                        }
                                                    }}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-sm font-semibold">
                                                                {user.displayName?.charAt(0)?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                                                            {/* <p className="text-xs text-gray-500">{user.email}</p> */}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-6 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateGroup(false)}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                    >
                                        Create Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Inner Group Modal */}
            {showCreateInnerGroup && selectedGroup && (
                <div className="fixed inset-0 bg-black/80 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-8 border w-11/12 max-w-2xl shadow-2xl rounded-2xl bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Create Inner Group</h3>
                                    <p className="text-gray-600 mt-1">Add a new inner group to "{selectedGroup.name}"</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateInnerGroup(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <form onSubmit={handleCreateInnerGroup} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Inner Group Name</label>
                                    <input
                                        type="text"
                                        value={innerGroupName}
                                        onChange={(e) => setInnerGroupName(e.target.value)}
                                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder="Enter inner group name"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Members</label>
                                    
                                    {/* Select All Button */}
                                    <div className="mb-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                console.log('Inner group Select All button clicked. Current state:', innerGroupMembers);
                                                const validUsers = safeUsers.filter(user => user.uid);
                                                if (innerGroupMembers.length === validUsers.length) {
                                                    // If all are selected, deselect all
                                                    console.log('Deselecting all users from inner group');
                                                    setInnerGroupMembers([]);
                                                } else {
                                                    // If not all are selected, select all
                                                    console.log('Selecting all users for inner group');
                                                    setInnerGroupMembers(validUsers.map(user => user.uid));
                                                }
                                            }}
                                            className="text-sm px-3 py-1 border border-gray-300 rounded-lg text-black hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            {innerGroupMembers.length === safeUsers.filter(user => user.uid).length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <span className="ml-2 text-xs text-gray-500">
                                            {innerGroupMembers.length} of {safeUsers.filter(user => user.uid).length} selected
                                        </span>
                                    </div>
                                    
                                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-xl p-3 space-y-2" key={`inner-group-checkboxes-${showCreateInnerGroup}`}>
                                        {safeUsers.filter(user => user.uid).map((user) => {
                                            const isSelected = innerGroupMembers.includes(user.uid);
                                            return (
                                                <label key={`inner-group-${user.uid}`} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        id={`checkbox-inner-group-${user.uid}`}
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                        console.log('Inner group checkbox changed for user:', user.uid, 'Checked:', e.target.checked);
                                                        if (e.target.checked) {
                                                            setInnerGroupMembers(prev => {
                                                                const newState = [...prev, user.uid];
                                                                console.log('Adding user to inner group, new state:', newState);
                                                                return newState;
                                                            });
                                                        } else {
                                                            setInnerGroupMembers(prev => {
                                                                const newState = prev.filter(id => id !== user.uid);
                                                                console.log('Removing user from inner group, new state:', newState);
                                                                return newState;
                                                            });
                                                        }
                                                    }}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                    />
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-sm font-semibold">
                                                                {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                                                            {/* <p className="text-xs text-gray-500">{user.email}</p> */}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-6 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateInnerGroup(false)}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                    >
                                        {selectedInnerGroup ? 'Update Inner Group' : 'Create Inner Group'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Members Modal */}
            {showManageMembers && selectedGroup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-8 border w-11/12 max-w-4xl shadow-2xl rounded-2xl bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Manage Group Members</h3>
                                    <p className="text-gray-600 mt-1">"{selectedGroup.name}" - Add or remove members</p>
                                </div>
                                <button
                                    onClick={() => setShowManageMembers(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Add Members */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Members</h4>
                                    <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-xl p-4 space-y-2">
                                        {safeUsers.filter(user => user.uid && !selectedGroup.members.includes(user.uid)).map((user) => (
                                            <div key={user.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                                        <span className="text-white text-sm font-semibold">
                                                            {user.displayName?.charAt(0)?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                                                        {/* <p className="text-xs text-gray-500">{user.email}</p> */}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddMemberToGroup(selectedGroup.id, user.uid)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                        {safeUsers.filter(user => user.uid && !selectedGroup.members.includes(user.uid)).length === 0 && (
                                            <p className="text-gray-500 text-center py-4">All users are already members</p>
                                        )}
                                    </div>
                                </div>

                                {/* Current Members */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Members ({selectedGroup.members.length})</h4>
                                    <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-xl p-4 space-y-2">
                                        {selectedGroup.members.map((memberId) => {
                                            const user = getUserById(memberId);
                                            if (!user) return null;
                                            return (
                                                <div key={memberId} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-sm font-semibold">
                                                                {user.displayName?.charAt(0)?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                                                            {/* <p className="text-xs text-gray-500">{user.email}</p> */}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveMemberFromGroup(selectedGroup.id, memberId)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t mt-6">
                                <button
                                    onClick={() => setShowManageMembers(false)}
                                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Inner Group Modal */}
            {showManageInnerGroup && selectedGroup && selectedInnerGroup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-8 border w-11/12 max-w-6xl shadow-2xl rounded-2xl bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Manage Inner Group</h3>
                                    <p className="text-gray-600 mt-1">"{selectedInnerGroup.name}" in "{selectedGroup.name}"</p>
                                </div>
                                <button
                                    onClick={() => setShowManageInnerGroup(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Inner Group Details - Editable */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Group Details</h4>
                                    <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                            <input
                                                type="text"

                                                value={selectedInnerGroup.name}
                                                onChange={(e) => setSelectedInnerGroup({
                                                    ...selectedInnerGroup,
                                                    name: e.target.value
                                                })}
                                                className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                                                <input
                                                    type="time"
                                                    value={selectedInnerGroup.startTime}
                                                    onChange={(e) => setSelectedInnerGroup({
                                                        ...selectedInnerGroup,
                                                        startTime: e.target.value
                                                    })}
                                                    className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                                <input
                                                    type="time"
                                                    value={selectedInnerGroup.endTime}
                                                    onChange={(e) => setSelectedInnerGroup({
                                                        ...selectedInnerGroup,
                                                        endTime: e.target.value
                                                    })}
                                                    className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                />
                                            </div>
                                        </div>
                                                                                 <div>
                                             <label className="block text-sm font-medium text-gray-700 mb-2">Created</label>
                                             <p className="text-lg font-medium text-gray-900 bg-white px-4 py-3 rounded-lg border border-gray-200">
                                                                                                 {(() => {
                                                   const createdAt = selectedInnerGroup.createdAt as any;
                                                   
                                                   // Check if it's a valid Date object
                                                   if (createdAt instanceof Date && !isNaN(createdAt.getTime())) {
                                                     return createdAt.toLocaleDateString('en-US', {
                                                       year: 'numeric',
                                                       month: 'long',
                                                       day: 'numeric',
                                                       hour: '2-digit',
                                                       minute: '2-digit'
                                                     });
                                                   } else if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
                                                     // Handle Firestore Timestamp
                                                     try {
                                                       const date = createdAt.toDate();
                                                       if (!isNaN(date.getTime())) {
                                                         return date.toLocaleDateString('en-US', {
                                                           year: 'numeric',
                                                           month: 'long',
                                                           day: 'numeric',
                                                           hour: '2-digit',
                                                           minute: '2-digit'
                                                         });
                                                       }
                                                     } catch (e) {
                                                       console.error('Error calling toDate():', e);
                                                     }
                                                   } else if (createdAt) {
                                                     // Try to create a Date from the value
                                                     try {
                                                       const date = new Date(createdAt);
                                                       if (!isNaN(date.getTime())) {
                                                         return date.toLocaleDateString('en-US', {
                                                           year: 'numeric',
                                                           month: 'long',
                                                           day: 'numeric',
                                                           hour: '2-digit',
                                                           minute: '2-digit'
                                                         });
                                                       }
                                                     } catch (e) {
                                                       console.error('Error parsing date:', e);
                                                     }
                                                   }
                                                   
                                                   // If we still can't get a valid date, try to get it from the raw data
                                                   console.log('Debug - Attempting to get date from raw data');
                                                   return 'Date not available - Check console for debug info';
                                                 })()}
                                             </p>
                                         </div>
                                        <button
                                            onClick={() => handleUpdateInnerGroup()}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors duration-200"
                                        >
                                            Update Group Details
                                        </button>
                                    </div>
                                </div>

                                {/* Add New Members */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Add New Members</h4>
                                    <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-xl p-4 space-y-2">
                                        {safeUsers.filter(user => user.uid && !selectedInnerGroup.members.includes(user.uid)).map((user) => (
                                            <div key={user.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                                        {/* <span className="text-white text-sm font-semibold">
                                                            {user.displayName?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()}
                                                        </span> */}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                                                        {/* <p className="text-xs text-gray-500">{user.email}</p> */}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddMemberToInnerGroup(selectedGroup.id, selectedInnerGroup.id, user.uid)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                        {safeUsers.filter(user => user.uid && !selectedInnerGroup.members.includes(user.uid)).length === 0 && (
                                            <p className="text-gray-500 text-center py-4">All users are already members</p>
                                        )}
                                    </div>
                                </div>

                                {/* Current Members */}
                                <div>
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Members ({selectedInnerGroup.members.length})</h4>
                                    <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-xl p-4 space-y-2">
                                        {selectedInnerGroup.members.map((memberId) => {
                                            const user = getUserById(memberId);
                                            if (!user) return null;
                                            return (
                                                <div key={memberId} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                                                <span className="text-white text-sm font-semibold">
                                                                    {user.displayName?.charAt(0)?.toUpperCase()}
                                                                </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                                                            {/* <p className="text-xs text-gray-500">{user.email}</p> */}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveMemberFromInnerGroup(selectedGroup.id, selectedInnerGroup.id, memberId)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {selectedInnerGroup.members.length === 0 && (
                                            <p className="text-gray-500 text-center py-4">No members in this inner group</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6 border-t mt-6">
                                <button
                                    onClick={() => setShowManageInnerGroup(false)}
                                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors duration-200"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Standalone Inner Group Modal */}
            {showCreateStandaloneInnerGroup && (
                <div className="fixed inset-0 bg-black/80 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-8 border w-11/12 max-w-2xl shadow-2xl rounded-2xl bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {selectedInnerGroup ? 'Edit Inner Group' : 'Create Reusable Inner Group'}
                                    </h3>
                                    <p className="text-gray-600 mt-1">
                                        {selectedInnerGroup 
                                            ? 'Update the inner group details' 
                                            : 'Create an inner group that can be reused across multiple groups'
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCreateStandaloneInnerGroup(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    <span className="text-2xl">×</span>
                                </button>
                            </div>

                            <form onSubmit={handleCreateStandaloneInnerGroup} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Inner Group Name</label>
                                    <input
                                        type="text"
                                        value={standaloneInnerGroupName}
                                        onChange={(e) => setStandaloneInnerGroupName(e.target.value)}
                                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        placeholder="Enter inner group name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                                    <textarea
                                        value={standaloneInnerGroupDescription}
                                        onChange={(e) => setStandaloneInnerGroupDescription(e.target.value)}
                                        className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                        placeholder="Enter description for this inner group"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                                        <input
                                            type="time"
                                            value={standaloneStartTime}
                                            onChange={(e) => setStandaloneStartTime(e.target.value)}
                                            className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                        <input
                                            type="time"
                                            value={standaloneEndTime}
                                            onChange={(e) => setStandaloneEndTime(e.target.value)}
                                            className="w-full px-4 py-3 border text-black border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Members</label>
                                    
                                    {/* Select All Button */}
                                    <div className="mb-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const validUsers = safeUsers.filter(user => user.uid);
                                                if (standaloneInnerGroupMembers.length === validUsers.length) {
                                                    setStandaloneInnerGroupMembers([]);
                                                } else {
                                                    setStandaloneInnerGroupMembers(validUsers.map(user => user.uid));
                                                }
                                            }}
                                            className="text-sm px-3 py-1 border text-black border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                                        >
                                            {standaloneInnerGroupMembers.length === safeUsers.filter(user => user.uid).length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <span className="ml-2 text-xs text-gray-500">
                                            {standaloneInnerGroupMembers.length} of {safeUsers.filter(user => user.uid).length} selected
                                        </span>
                                    </div>
                                    
                                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-xl p-3 space-y-2">
                                        {safeUsers.filter(user => user.uid).map((user) => {
                                            const isSelected = standaloneInnerGroupMembers.includes(user.uid);
                                            return (
                                                <label key={`standalone-${user.uid}`} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        id={`checkbox-standalone-${user.uid}`}
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setStandaloneInnerGroupMembers(prev => [...prev, user.uid]);
                                                            } else {
                                                                setStandaloneInnerGroupMembers(prev => prev.filter(id => id !== user.uid));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                    />
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                                            <span className="text-white text-sm font-semibold">
                                                                {user.displayName?.charAt(0)?.toUpperCase() || 'U'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{user.displayName || 'No Name'}</p>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 pt-6 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateStandaloneInnerGroup(false)}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                                    >
                                        Create Inner Group
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageGroupsTab;