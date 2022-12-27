SELECT Concat('DROP TRIGGER ', Trigger_Name, ';') FROM  information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = 'vc';

CREATE TRIGGER `shifts_creationTrigger` BEFORE INSERT ON `shifts`
 FOR EACH ROW IF (NEW.created_at IS NULL) THEN
      SET NEW.created_at = CURRENT_TIMESTAMP;
END IF;

CREATE TRIGGER `shifts_updationTrigger` BEFORE UPDATE ON `shifts`
 FOR EACH ROW IF (NEW.updated_at IS NULL) THEN
      SET NEW.updated_at = CURRENT_TIMESTAMP;
END IF;

CREATE TRIGGER `users_creationTrigger` BEFORE INSERT ON `users`
 FOR EACH ROW IF (NEW.created_at IS NULL) THEN
      SET NEW.created_at = CURRENT_TIMESTAMP;
END IF;


CREATE TRIGGER `users_updationTrigger` BEFORE UPDATE ON `users`
 FOR EACH ROW IF (NEW.updated_at IS NULL) THEN
      SET NEW.updated_at = CURRENT_TIMESTAMP;
END IF;