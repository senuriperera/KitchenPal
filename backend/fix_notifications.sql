-- 1. Create the sequence
CREATE SEQUENCE IF NOT EXISTS notifications_notification_id_seq;

-- 2. Assign the sequence as the default value for the column
ALTER TABLE notifications ALTER COLUMN notification_id SET DEFAULT nextval('notifications_notification_id_seq');

-- 3. Tie the sequence's lifecycle to the column
ALTER SEQUENCE notifications_notification_id_seq OWNED BY notifications.notification_id;

-- 4. Sync the sequence with any existing data (if there are rows, set the sequence to MAX+1)
SELECT setval('notifications_notification_id_seq', COALESCE((SELECT MAX(notification_id) FROM notifications), 1), false);

-- 5. Inspect and Fix CHECK Constraints (if any exist for notification_type/status)
-- Since Ingredient.js uses lowercase values like 'expiry_alert' and 'unread'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_notification_type_check CHECK (
    notification_type IN (
        'expiry_alert',
        'recipe_pending',
        'recipe_approved',
        'recipe_rejected',
        'EXPIRING_SOON',
        'EXPIRY_ALERT' -- Keep uppercase for backward compat just in case
    )
);

ALTER TABLE notifications ADD CONSTRAINT notifications_status_check CHECK (status IN ('unread', 'read', 'UNREAD', 'READ'));

-- 6. Also drop older default values if they cast types weirdly or are uppercase
ALTER TABLE notifications ALTER COLUMN notification_type DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN status DROP DEFAULT;
ALTER TABLE notifications ALTER COLUMN status SET DEFAULT 'unread';
