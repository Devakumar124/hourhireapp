import React, { useState, useEffect } from 'react';
import { ChefHat, Briefcase, User, Building, LogOut, CheckCircle, Search, FileText, MapPin, DollarSign, Users, Clock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function App() {
  // Global State
  const [currentUser, setCurrentUser] = useState(null); // { role: 'client' | 'user', data: {} }
  const [profiles, setProfiles] = useState([]); // combines users and clients
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [fbUser, setFbUser] = useState(null);

  // Auth State
  const [isLoginView, setIsLoginView] = useState(true);
  const [authRole, setAuthRole] = useState('user'); // 'client' or 'user'
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', restaurantName: '' });
  const [authError, setAuthError] = useState('');

  // Dashboard View State
  const [activeTab, setActiveTab] = useState('profile'); // profile, explore/post, applications/manage

  useEffect(() => {
    // Canvas-specific background authentication
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error.message);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setFbUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!fbUser) return;

    const profilesRef = collection(db, 'artifacts', appId, 'public', 'data', 'profiles');
    const unsubProfiles = onSnapshot(profilesRef, (snap) => {
      setProfiles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const jobsRef = collection(db, 'artifacts', appId, 'public', 'data', 'jobs');
    const unsubJobs = onSnapshot(jobsRef, (snap) => {
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    const appsRef = collection(db, 'artifacts', appId, 'public', 'data', 'applications');
    const unsubApps = onSnapshot(appsRef, (snap) => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));

    return () => { unsubProfiles(); unsubJobs(); unsubApps(); };
  }, [fbUser]);

  const handleAuthChange = (e) => setAuthForm({ ...authForm, [e.target.name]: e.target.value });

  const login = (e) => {
    e.preventDefault();
    setAuthError('');
    const profile = profiles.find(p => p.email === authForm.email && p.password === authForm.password && p.role === authRole);
    if (profile) { setCurrentUser({ role: authRole, data: profile }); setActiveTab('profile'); }
    else setAuthError('Invalid credentials');
  };

  const register = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!fbUser) return setAuthError('Connecting to cloud database...');

    if (profiles.find(p => p.email === authForm.email)) return setAuthError('Email already exists');
    
    const id = Math.random().toString(36).substring(7);
    let newProfile;
    
    if (authRole === 'client') {
      newProfile = { id: `c_${id}`, role: 'client', email: authForm.email, password: authForm.password, restaurantName: authForm.restaurantName, address: '', description: '' };
    } else {
      newProfile = { id: `u_${id}`, role: 'user', email: authForm.email, password: authForm.password, name: authForm.name, address: '', contact: '', interestedRoles: '' };
    }
    
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', newProfile.id), newProfile);
    setCurrentUser({ role: authRole, data: newProfile });
    setActiveTab('profile');
  };

  const logout = () => {
    setCurrentUser(null);
    setAuthForm({ email: '', password: '', name: '', restaurantName: '' });
  };

  // --- RENDER AUTH ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8 text-center bg-blue-600 text-white">
            <ChefHat className="w-12 h-12 mx-auto mb-2" />
            <h1 className="text-2xl font-bold">RestoHire</h1>
            <p className="text-blue-100 text-sm mt-1">Connecting great talent with great restaurants</p>
          </div>
          
          <div className="p-8">
            <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${authRole === 'user' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setAuthRole('user'); setAuthError(''); }}
              >
                Job Seeker
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${authRole === 'client' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                onClick={() => { setAuthRole('client'); setAuthError(''); }}
              >
                Restaurant Owner
              </button>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-6">
              {isLoginView ? 'Welcome Back' : 'Create an Account'}
            </h2>

            {authError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{authError}</div>}

            <form onSubmit={isLoginView ? login : register} className="space-y-4">
              {!isLoginView && authRole === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input required name="name" type="text" value={authForm.name} onChange={handleAuthChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="John Doe" />
                </div>
              )}
              {!isLoginView && authRole === 'client' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Restaurant Name</label>
                  <input required name="restaurantName" type="text" value={authForm.restaurantName} onChange={handleAuthChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Pasta Palace" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input required name="email" type="email" value={authForm.email} onChange={handleAuthChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input required name="password" type="password" value={authForm.password} onChange={handleAuthChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="••••••••" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                {isLoginView ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {isLoginView ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setIsLoginView(!isLoginView)} className="text-blue-600 font-medium hover:underline">
                {isLoginView ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- CLIENT DASHBOARD ---
  const ClientDashboard = () => {
    const client = currentUser.data;
    const [profileForm, setProfileForm] = useState(client);
    const [jobForm, setJobForm] = useState({ title: '', pay: '', vacancies: '' });
    const [saveMsg, setSaveMsg] = useState('');

    const updateProfile = async (e) => {
      e.preventDefault();
      if (!fbUser) return;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', client.id), profileForm);
      setCurrentUser({ ...currentUser, data: profileForm });
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    };

    const postJob = async (e) => {
      e.preventDefault();
      if (!fbUser) return;
      const newJob = {
        id: `j_${Math.random().toString(36).substring(7)}`,
        clientId: client.id,
        restaurantName: client.restaurantName,
        title: jobForm.title,
        pay: jobForm.pay,
        vacancies: parseInt(jobForm.vacancies)
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'jobs', newJob.id), newJob);
      setJobForm({ title: '', pay: '', vacancies: '' });
      setSaveMsg('Job posted successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    };

    const myJobs = jobs.filter(j => j.clientId === client.id);

    return (
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row gap-8 flex-1">
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-2">
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Building className="w-5 h-5" /> Restaurant Profile
            </button>
            <button onClick={() => setActiveTab('postJob')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'postJob' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <FileText className="w-5 h-5" /> Post a Vacancy
            </button>
            <button onClick={() => setActiveTab('manage')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'manage' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users className="w-5 h-5" /> Applicants & Jobs
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 min-h-[calc(100vh-10rem)]">
            {saveMsg && <div className="mb-6 p-4 bg-green-50 text-green-700 flex items-center gap-2 rounded-lg"><CheckCircle className="w-5 h-5"/> {saveMsg}</div>}

            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Restaurant Information</h2>
                <form onSubmit={updateProfile} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Restaurant Name</label>
                    <input required value={profileForm.restaurantName} onChange={e => setProfileForm({...profileForm, restaurantName: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location/Address</label>
                    <input required value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123 Main St, City, State" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea rows="4" value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tell candidates about your restaurant..."></textarea>
                  </div>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Save Profile</button>
                </form>
              </div>
            )}

            {activeTab === 'postJob' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Vacancy</h2>
                <form onSubmit={postJob} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Position Name</label>
                    <input required value={jobForm.title} onChange={e => setJobForm({...jobForm, title: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Senior Line Cook" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Pay / Compensation</label>
                    <input required value={jobForm.pay} onChange={e => setJobForm({...jobForm, pay: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., $20/hr or $50,000/yr" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Number of Vacancies</label>
                    <input required type="number" min="1" value={jobForm.vacancies} onChange={e => setJobForm({...jobForm, vacancies: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="1" />
                  </div>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Post Vacancy</button>
                </form>
              </div>
            )}

            {activeTab === 'manage' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Manage Applicants</h2>
                {myJobs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">You haven't posted any jobs yet.</div>
                ) : (
                  <div className="space-y-6">
                    {myJobs.map(job => {
                      const jobApps = applications.filter(a => a.jobId === job.id);
                      return (
                        <div key={job.id} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div>
                              <h3 className="font-bold text-lg text-slate-800">{job.title}</h3>
                              <p className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{job.pay}</span>
                                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{job.vacancies} slots</span>
                              </p>
                            </div>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                              {jobApps.length} Applicant{jobApps.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {jobApps.length === 0 ? (
                              <div className="px-5 py-6 text-sm text-slate-500 text-center">No applications yet.</div>
                            ) : (
                              jobApps.map(app => {
                                const applicant = profiles.find(p => p.id === app.userId);
                                return (
                                  <div key={app.id} className="px-5 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div>
                                      <p className="font-medium text-slate-800">{applicant?.name}</p>
                                      <p className="text-sm text-slate-500 mt-0.5">{applicant?.contact} • {applicant?.email}</p>
                                    </div>
                                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Profile</button>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- USER DASHBOARD ---
  const UserDashboard = () => {
    const user = currentUser.data;
    const [profileForm, setProfileForm] = useState(user);
    const [saveMsg, setSaveMsg] = useState('');

    const updateProfile = async (e) => {
      e.preventDefault();
      if (!fbUser) return;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'profiles', user.id), profileForm);
      setCurrentUser({ ...currentUser, data: profileForm });
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    };

    const applyForJob = async (jobId) => {
      if (!fbUser) return;
      if (applications.find(a => a.jobId === jobId && a.userId === user.id)) return;
      const newApp = {
        id: `a_${Math.random().toString(36).substring(7)}`,
        jobId,
        userId: user.id,
        status: 'Applied',
        date: new Date().toISOString().split('T')[0]
      };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'applications', newApp.id), newApp);
    };

    const myApplications = applications.filter(a => a.userId === user.id);

    return (
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row gap-8 flex-1">
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 flex-shrink-0 space-y-2">
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <User className="w-5 h-5" /> My Profile
            </button>
            <button onClick={() => setActiveTab('explore')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'explore' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Search className="w-5 h-5" /> Explore Jobs
            </button>
            <button onClick={() => setActiveTab('applications')} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'applications' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className="flex items-center gap-3"><Briefcase className="w-5 h-5" /> My Applications</span>
              {myApplications.length > 0 && <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">{myApplications.length}</span>}
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 min-h-[calc(100vh-10rem)]">
            {saveMsg && <div className="mb-6 p-4 bg-green-50 text-green-700 flex items-center gap-2 rounded-lg"><CheckCircle className="w-5 h-5"/> {saveMsg}</div>}

            {activeTab === 'profile' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Personal Profile</h2>
                <form onSubmit={updateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                      <input required value={profileForm.contact} onChange={e => setProfileForm({...profileForm, contact: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., (555) 123-4567" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <input value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123 Main St, City, State" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Interested Roles</label>
                    <input value={profileForm.interestedRoles} onChange={e => setProfileForm({...profileForm, interestedRoles: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g., Chef, Waitstaff, Manager" />
                    <p className="text-xs text-slate-500 mt-1">Comma separated list of roles you are looking for.</p>
                  </div>
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Save Profile</button>
                </form>
              </div>
            )}

            {activeTab === 'explore' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Open Vacancies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map(job => {
                    const hasApplied = applications.some(a => a.jobId === job.id && a.userId === user.id);
                    const clientInfo = profiles.find(p => p.id === job.clientId);
                    
                    return (
                      <div key={job.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col h-full">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-slate-800">{job.title}</h3>
                          <div className="flex items-center gap-2 text-slate-600 mt-1 mb-4">
                            <Building className="w-4 h-4" />
                            <span className="font-medium text-sm">{job.restaurantName}</span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-slate-600 mb-6">
                            <p className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-slate-400" /> {job.pay}</p>
                            <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {clientInfo?.address || 'Location hidden'}</p>
                            <p className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> {job.vacancies} open position(s)</p>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => applyForJob(job.id)}
                          disabled={hasApplied}
                          className={`w-full py-2.5 rounded-lg font-medium transition-colors ${hasApplied ? 'bg-green-50 text-green-700 border border-green-200 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          {hasApplied ? 'Applied ✓' : 'Apply Now'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'applications' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">My Applications</h2>
                {myApplications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">You haven't applied to any jobs yet.</div>
                ) : (
                  <div className="space-y-4">
                    {myApplications.map(app => {
                      const job = jobs.find(j => j.id === app.jobId);
                      if (!job) return null; // In case job was deleted
                      return (
                        <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                          <div>
                            <h3 className="font-bold text-slate-800">{job.title}</h3>
                            <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                              <Building className="w-4 h-4" /> {job.restaurantName}
                            </p>
                          </div>
                          <div className="mt-4 sm:mt-0 flex items-center gap-4">
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {app.date}
                            </span>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full">
                              {app.status}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600">
            <ChefHat className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight">RestoHire</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right hidden sm:block">
              <p className="font-medium text-slate-800">{currentUser.data.name || currentUser.data.restaurantName}</p>
              <p className="text-slate-500 text-xs capitalize">{currentUser.role} Account</p>
            </div>
            <button onClick={logout} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Log out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {currentUser.role === 'client' ? <ClientDashboard /> : <UserDashboard />}
      </main>
    </div>
  );
}