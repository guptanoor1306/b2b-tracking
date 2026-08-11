-- Allow multiple QC rounds per project (drop one-submission-per-project constraint)
ALTER TABLE qc_review_submissions DROP CONSTRAINT IF EXISTS qc_review_submissions_project_id_key;
