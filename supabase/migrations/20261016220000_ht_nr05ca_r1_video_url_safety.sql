-- HT-NR-05C-A-R1: Video Desk Public URL Safety Remediation
-- Replace public.newsroom_validate_video_https_url to enforce public DNS boundary
-- Rejects localhost, IPv4, IPv6, single-label hosts, and embedded credentials
-- Accepts valid absolute HTTPS URLs with paths, queries, and fragments

create or replace function public.newsroom_validate_video_https_url(p_url text)
returns boolean
language plpgsql
immutable
as $$
declare
  v_trimmed text;
  v_rest text;
  v_host text;
begin
  if p_url is null then
    return false;
  end if;
  v_trimmed := trim(p_url);
  if length(v_trimmed) = 0 then
    return false;
  end if;
  -- Must not contain whitespace
  if v_trimmed ~ '\s' then
    return false;
  end if;
  -- Must start with https://
  if v_trimmed !~* '^https://' then
    return false;
  end if;

  -- Remainder after https://
  v_rest := substring(v_trimmed from 9);

  -- Reject username/password credentials before /, ?, or #
  if v_rest ~ '^[^/?#]*@' then
    return false;
  end if;

  -- Extract host (and optional port) before /, ?, or #
  v_host := substring(v_rest from '^([^/?#]+)');
  if v_host is null or length(v_host) = 0 then
    return false;
  end if;

  -- Strip optional port :[0-9]+
  if v_host ~ ':[0-9]+$' then
    v_host := regexp_replace(v_host, ':[0-9]+$', '');
  elsif v_host ~ ':' then
    -- IPv6 or malformed port
    return false;
  end if;

  -- Check localhost
  if lower(v_host) = 'localhost' or lower(v_host) like '%.localhost' then
    return false;
  end if;

  -- Check raw IPv4 (e.g. 127.0.0.1)
  if v_host ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$' then
    return false;
  end if;

  -- Must be public DNS-style hostname with at least one dot
  if v_host !~ '\.' then
    return false;
  end if;

  -- Must match standard DNS hostname regex:
  -- labels separated by dots, each label 1-63 alphanumeric/hyphen, not starting/ending with hyphen,
  -- and TLD at least 2 alpha characters
  if v_host !~* '^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$' then
    return false;
  end if;

  return true;
end;
$$;

revoke execute on function public.newsroom_validate_video_https_url(text) from public, anon;
grant execute on function public.newsroom_validate_video_https_url(text) to authenticated, service_role, postgres;
