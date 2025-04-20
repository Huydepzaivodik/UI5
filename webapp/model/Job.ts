export interface Job {
  Id: string;
  Jobname: string;
  Jobcount: string;
  Status: string;
  Strtdate: string;
  Strttime: string | null;
  Enddate: string;
  Endtime: string | null;
  Authcknam: string;
  Stepcount: number;
  Progname: string;
  Variant: string | null;
  Error_msg: string;
  Duration: number;
  Custom_log: string;
  Alert_sent: string | null;
  Delay: number;
  Sdlstrtdt: string;
  Sdlstrttm: string | null;
  Create_by: string;
  Create_on: string;
  Create_at: string | null;
  Change_by: string;
  Change_on: string;
  Change_at: string | null;
}