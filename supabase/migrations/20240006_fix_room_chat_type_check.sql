-- Fix: restore 'reaction' type that was accidentally dropped from room_chat constraint
ALTER TABLE room_chat DROP CONSTRAINT IF EXISTS room_chat_type_check;
ALTER TABLE room_chat ADD CONSTRAINT room_chat_type_check
  CHECK (type IN ('message', 'reaction', 'system', 'ghost'));
