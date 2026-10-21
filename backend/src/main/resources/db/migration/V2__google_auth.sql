-- Google sign-in: the Google account's stable subject id, set once a user signs in with Google.
ALTER TABLE users ADD COLUMN google_id character varying(255);
ALTER TABLE users ADD CONSTRAINT uk_users_google_id UNIQUE (google_id);
