-- Keep the database boundary aligned with app/lib/brief.ts. The form has used
-- these shorter minimums since the edit flow was simplified, but the original
-- constraints still required 120/120/40 characters and rejected otherwise
-- valid project saves.

alter table public.projects
  drop constraint projects_problem_len,
  drop constraint projects_solution_len,
  drop constraint projects_audience_len;

alter table public.projects
  add constraint projects_problem_len
    check (char_length(problem) between 80 and 2000),
  add constraint projects_solution_len
    check (char_length(solution) between 80 and 2000),
  add constraint projects_audience_len
    check (char_length(audience) between 25 and 600);
