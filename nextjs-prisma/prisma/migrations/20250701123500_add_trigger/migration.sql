CREATE OR REPLACE FUNCTION notify_quote_submission() RETURNS TRIGGER as $$
  BEGIN
    PERFORM pg_notify('submit_quote', NEW.id::text);
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_quote_submission AFTER INSERT ON "Quote"
  FOR EACH ROW EXECUTE FUNCTION notify_quote_submission();
