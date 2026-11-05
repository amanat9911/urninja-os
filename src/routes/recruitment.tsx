// Recruitment and Applicant Tracking (ATS) — Job openings, candidate pipeline, interviews and one-click hiring
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Briefcase, Plus, UserPlus, Star, Calendar, FileText, CheckCircle2, XCircle, Search, Filter
} from "lucide-react";
import { useDemo, update, deptName, empName, convertApplicantToEmployee } from "@/store/demo-store";
import { PageHeader, Panel, StatusBadge, Select, Field, inputCls, textareaCls, TableWrap, DemoTag, Avatar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Applicant, ApplicantStage, JobOpening, Role } from "@/types";
import { pageHead } from "@/lib/seo";
import { toast } from "sonner";
import { fmtDate, today } from "@/utils/format";

export const Route = createFileRoute("/recruitment")({
  head: pageHead("Recruitment & ATS", "Job openings, candidate tracking, interview evaluations, and automated hiring."),
  component: RecruitmentPage,
});

const STAGES: ApplicantStage[] = ["Applied", "Screening", "Interview Scheduled", "Offered", "Selected", "Rejected"];

export function RecruitmentPage() {
  const s = useDemo();
  const [activeTab, setActiveTab] = useState<"candidates" | "jobs">("candidates");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // New Job Opening Dialog
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [jobForm, setJobForm] = useState({
    title: "",
    departmentId: s.departments[0]?.id ?? "D01",
    openings: 1,
    type: "Full-time" as JobOpening["type"],
    experienceRequired: "1-3 years",
  });

  // Convert to Employee Dialog
  const [hiringApplicant, setHiringApplicant] = useState<Applicant | null>(null);
  const [hireForm, setHireForm] = useState({
    role: "Employee" as Role,
    departmentId: "D05",
    designation: "",
    managerId: s.employees[0]?.id ?? "UN-1001",
    password: "welcome123",
  });

  // Filtered applicants
  const filteredApplicants = s.applicants.filter((a) => {
    const matchesStage = !stageFilter || a.currentStage === stageFilter;
    const matchesQuery = !searchQuery || (a.name + a.email + a.phone).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesQuery;
  });

  const handleCreateJob = () => {
    if (!jobForm.title) {
      toast.error("Please enter job title");
      return;
    }
    const newJob: JobOpening = {
      id: `JOB-${String(s.jobOpenings.length + 1).padStart(2, "0")}`,
      ...jobForm,
      status: "Open",
      postedDate: today(),
    };
    update((state) => ({
      ...state,
      jobOpenings: [newJob, ...state.jobOpenings],
    }), { action: `posted new job opening ${newJob.title}`, module: "Recruitment" });

    toast.success(`Job opening ${newJob.title} posted.`);
    setIsAddingJob(false);
    setJobForm({ title: "", departmentId: s.departments[0]?.id ?? "D01", openings: 1, type: "Full-time", experienceRequired: "1-3 years" });
  };

  const handleUpdateStage = (applicantId: string, stage: ApplicantStage) => {
    update((state) => ({
      ...state,
      applicants: state.applicants.map((a) => (a.id === applicantId ? { ...a, currentStage: stage } : a)),
    }), { action: `moved candidate to ${stage}`, module: "Recruitment" });
    toast.success(`Candidate status updated to ${stage}`);
    if (selectedApplicant?.id === applicantId) {
      setSelectedApplicant((prev) => (prev ? { ...prev, currentStage: stage } : null));
    }
  };

  const handleHireApplicant = () => {
    if (!hiringApplicant) return;
    const newEmpId = convertApplicantToEmployee(hiringApplicant.id, {
      name: hiringApplicant.name,
      email: hiringApplicant.email,
      phone: hiringApplicant.phone,
      role: hireForm.role,
      departmentId: hireForm.departmentId,
      designation: hireForm.designation || "Executive",
      managerId: hireForm.managerId,
      password: hireForm.password,
    });

    toast.success(`Hired! Employee created with ID ${newEmpId}. Login credentials and onboarding tasks initiated.`);
    setHiringApplicant(null);
    setSelectedApplicant(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment & Applicant Tracking (ATS)"
        subtitle="Manage job openings, interview pipelines, candidate evaluations, and one-click employee conversion"
        actions={
          <div className="flex gap-2">
            <Button variant={activeTab === "candidates" ? "default" : "outline"} onClick={() => setActiveTab("candidates")}>
              Candidate Pipeline ({s.applicants.length})
            </Button>
            <Button variant={activeTab === "jobs" ? "default" : "outline"} onClick={() => setActiveTab("jobs")}>
              Job Openings ({s.jobOpenings.length})
            </Button>
            <Button onClick={() => setIsAddingJob(true)}>
              <Plus className="size-4" /> Post Job
            </Button>
          </div>
        }
      />

      {activeTab === "candidates" ? (
        <div className="space-y-4">
          <Panel>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search applicant name, email, or phone..."
                  className={inputCls + " pl-8"}
                />
              </div>
              <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="">All Stages</option>
                {STAGES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </Select>
            </div>

            <TableWrap>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Position</th>
                  <th>Experience</th>
                  <th>Applied On</th>
                  <th>Rating</th>
                  <th>Stage</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredApplicants.map((app) => {
                  const job = s.jobOpenings.find((j) => j.id === app.jobId);
                  return (
                    <tr key={app.id} className="cursor-pointer" onClick={() => setSelectedApplicant(app)}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={app.name} size={32} />
                          <div>
                            <p className="font-medium text-sm">{app.name}</p>
                            <p className="text-xs text-muted-foreground">{app.email} · {app.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm font-medium">{job?.title || "Direct Application"}</p>
                        <p className="text-xs text-muted-foreground">{job ? deptName(s, job.departmentId) : "General"}</p>
                      </td>
                      <td>{app.experienceYears} yrs</td>
                      <td>{fmtDate(app.appliedDate)}</td>
                      <td>
                        {app.rating ? (
                          <div className="flex items-center gap-1 text-xs font-semibold text-warning">
                            <Star className="size-3.5 fill-warning" /> {app.rating}/5
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={app.currentStage} />
                      </td>
                      <td>
                        {app.currentStage === "Selected" && !app.convertedToEmployeeId && (
                          <Button
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setHiringApplicant(app);
                              setHireForm({
                                role: "Employee",
                                departmentId: job?.departmentId || "D05",
                                designation: job?.title || "Executive",
                                managerId: s.employees[0]?.id ?? "UN-1001",
                                password: "welcome123",
                              });
                            }}
                          >
                            <UserPlus className="size-3.5" /> Convert to Employee
                          </Button>
                        )}
                        {app.convertedToEmployeeId && (
                          <span className="text-xs font-medium text-success flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> {app.convertedToEmployeeId}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </Panel>
        </div>
      ) : (
        /* Jobs List */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {s.jobOpenings.map((job) => {
            const applicantsCount = s.applicants.filter((a) => a.jobId === job.id).length;
            return (
              <Panel key={job.id} title={job.title}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-primary">{deptName(s, job.departmentId)}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                    <div>
                      <span className="text-muted-foreground">Type: </span>
                      <span className="font-medium">{job.type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experience: </span>
                      <span className="font-medium">{job.experienceRequired}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Openings: </span>
                      <span className="font-medium">{job.openings}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Applicants: </span>
                      <span className="font-medium">{applicantsCount}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1">Posted on {fmtDate(job.postedDate)}</p>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Applicant Detail Dialog */}
      <Dialog open={!!selectedApplicant} onOpenChange={() => setSelectedApplicant(null)}>
        <DialogContent className="max-w-xl">
          {selectedApplicant && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar name={selectedApplicant.name} size={44} />
                  <div>
                    <span>{selectedApplicant.name}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      Applied for {s.jobOpenings.find((j) => j.id === selectedApplicant.jobId)?.title}
                    </span>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedApplicant.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedApplicant.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resume Document</p>
                  <p className="font-medium flex items-center gap-1 text-primary">
                    <FileText className="size-3.5" /> {selectedApplicant.resumeFileName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-medium">{selectedApplicant.experienceYears} Years</p>
                </div>
              </div>

              {selectedApplicant.interviewFeedback && (
                <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">Interview Evaluation & Feedback:</p>
                  <p className="text-muted-foreground">{selectedApplicant.interviewFeedback}</p>
                  {selectedApplicant.interviewerId && (
                    <p className="text-[11px] text-primary pt-1">Evaluated by {empName(s, selectedApplicant.interviewerId)}</p>
                  )}
                </div>
              )}

              {/* Stage Progression Buttons */}
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground">Update Candidate Stage:</p>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((st) => (
                    <Button
                      key={st}
                      size="sm"
                      variant={selectedApplicant.currentStage === st ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => handleUpdateStage(selectedApplicant.id, st)}
                    >
                      {st}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedApplicant.currentStage === "Selected" && !selectedApplicant.convertedToEmployeeId && (
                <div className="rounded-xl border border-success/40 bg-success/10 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-success">Applicant Ready for Onboarding</p>
                    <p className="text-xs text-muted-foreground">Create official employee account, hierarchy link and login credentials.</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setHiringApplicant(selectedApplicant);
                      const job = s.jobOpenings.find((j) => j.id === selectedApplicant.jobId);
                      setHireForm({
                        role: "Employee",
                        departmentId: job?.departmentId || "D05",
                        designation: job?.title || "Executive",
                        managerId: s.employees[0]?.id ?? "UN-1001",
                        password: "welcome123",
                      });
                    }}
                  >
                    Convert to Employee
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Employee Modal */}
      <Dialog open={!!hiringApplicant} onOpenChange={() => setHiringApplicant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Convert Applicant into Employee Record</DialogTitle>
          </DialogHeader>
          {hiringApplicant && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Finalize new employee record for <b>{hiringApplicant.name}</b>. This will generate their official Employee ID,
                active login account, department connection, and initialize automated onboarding tasks.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Designation">
                  <input
                    className={inputCls}
                    value={hireForm.designation}
                    onChange={(e) => setHireForm({ ...hireForm, designation: e.target.value })}
                  />
                </Field>
                <Field label="Role in System">
                  <Select
                    value={hireForm.role}
                    onChange={(e) => setHireForm({ ...hireForm, role: e.target.value as Role })}
                    className="w-full"
                  >
                    <option value="Employee">Employee</option>
                    <option value="Team Leader">Team Leader</option>
                    <option value="Manager">Manager</option>
                    <option value="Department Head">Department Head</option>
                    <option value="HR">HR</option>
                  </Select>
                </Field>
                <Field label="Department">
                  <Select
                    value={hireForm.departmentId}
                    onChange={(e) => setHireForm({ ...hireForm, departmentId: e.target.value })}
                    className="w-full"
                  >
                    {s.departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Reporting Manager">
                  <Select
                    value={hireForm.managerId}
                    onChange={(e) => setHireForm({ ...hireForm, managerId: e.target.value })}
                    className="w-full"
                  >
                    {s.employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Initial Temporary Password">
                <input
                  type="text"
                  className={inputCls}
                  value={hireForm.password}
                  onChange={(e) => setHireForm({ ...hireForm, password: e.target.value })}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setHiringApplicant(null)}>Cancel</Button>
                <Button onClick={handleHireApplicant}>Confirm & Generate Employee</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Post Job Modal */}
      <Dialog open={isAddingJob} onOpenChange={setIsAddingJob}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Post New Job Opening</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Job Title">
              <input
                className={inputCls}
                placeholder="e.g. Senior Frontend Engineer"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department">
                <Select
                  value={jobForm.departmentId}
                  onChange={(e) => setJobForm({ ...jobForm, departmentId: e.target.value })}
                  className="w-full"
                >
                  {s.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Job Type">
                <Select
                  value={jobForm.type}
                  onChange={(e) => setJobForm({ ...jobForm, type: e.target.value as JobOpening["type"] })}
                  className="w-full"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Remote">Remote</option>
                </Select>
              </Field>
              <Field label="Experience Required">
                <input
                  className={inputCls}
                  placeholder="e.g. 2-4 years"
                  value={jobForm.experienceRequired}
                  onChange={(e) => setJobForm({ ...jobForm, experienceRequired: e.target.value })}
                />
              </Field>
              <Field label="Open Positions">
                <input
                  type="number"
                  className={inputCls}
                  value={jobForm.openings}
                  onChange={(e) => setJobForm({ ...jobForm, openings: Number(e.target.value) || 1 })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsAddingJob(false)}>Cancel</Button>
              <Button onClick={handleCreateJob}>Publish Job Opening</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
