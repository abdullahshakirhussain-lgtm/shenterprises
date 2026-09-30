export function browserSession(): string {
 const existing = document.cookie.match(/(?:^|;\s*)sh_sid=([^;]*)/)?.[1];
 if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
 const id = crypto.randomUUID();
 document.cookie = "sh_sid=" + id + ";path=/;max-age=31536000;SameSite=Lax" + (location.protocol === "https:" ? ";Secure" : "");
 return id;
}
