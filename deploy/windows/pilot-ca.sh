#!/usr/bin/env bash
# Creates the pilot's private certificate authority and the server certificate (run on Magnus's Mac).
# The CA is limited by X.509 name constraints to the pilot host's names, so even if its key leaked
# it could not vouch for any other website. Keep ca.key offline (encrypted USB or password manager);
# it never goes on the pilot machine. Install ca.crt in each staff PC's Trusted Root store once.
#   ./pilot-ca.sh clerk clerk.uhyask.local 192.168.1.50
set -euo pipefail
OPENSSL="${OPENSSL:-$(command -v /opt/homebrew/opt/openssl@3/bin/openssl || command -v openssl)}"
SHORT="${1:?short host name, e.g. clerk}"; FQDN="${2:?full host name, e.g. clerk.uhyask.local}"; IP="${3:?fixed IP address of the pilot machine}"
OUT="${OUT:-./pilot-ca-out}"; mkdir -p "$OUT"; umask 077
cat > "$OUT/ca.cnf" <<CNF
[req]
distinguished_name = dn
prompt = no
[dn]
CN = Clerk pilot CA (${FQDN} only)
O = Caine Road Ventures
[ext]
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, keyCertSign, cRLSign
nameConstraints = critical, permitted;DNS:${SHORT}, permitted;DNS:${FQDN}, permitted;IP:${IP}/255.255.255.255
subjectKeyIdentifier = hash
CNF
"$OPENSSL" req -x509 -newkey rsa:3072 -sha256 -days 1825 -nodes -keyout "$OUT/ca.key" -out "$OUT/ca.crt" -config "$OUT/ca.cnf" -extensions ext
cat > "$OUT/server.cnf" <<CNF
[req]
distinguished_name = dn
prompt = no
[dn]
CN = ${FQDN}
[ext]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:${SHORT}, DNS:${FQDN}, IP:${IP}
CNF
"$OPENSSL" req -newkey rsa:2048 -sha256 -nodes -keyout "$OUT/server.key" -out "$OUT/server.csr" -config "$OUT/server.cnf"
"$OPENSSL" x509 -req -in "$OUT/server.csr" -CA "$OUT/ca.crt" -CAkey "$OUT/ca.key" -CAcreateserial -days 397 -sha256 -extfile "$OUT/server.cnf" -extensions ext -out "$OUT/server.crt"
rm -f "$OUT/server.csr"
"$OPENSSL" verify -CAfile "$OUT/ca.crt" "$OUT/server.crt"
echo "Done. ca.crt -> staff PCs (Trusted Root). server.crt + server.key -> C:\\Clerk\\certs on the pilot machine. ca.key -> offline storage only."
echo "Renew the server certificate within 397 days by re-running the last steps with the same ca.key; the PCs need nothing new."
