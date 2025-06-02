@echo off
echo Generating mobile-compatible certificate...

:: Generate private key
openssl genrsa -out mobile-cert.key 2048

:: Generate certificate signing request
openssl req -new -key mobile-cert.key -out mobile-cert.csr -subj "/C=ID/ST=Jakarta/L=Jakarta/O=VComm/OU=IT/CN=192.168.66.34"

:: Generate self-signed certificate valid for 1 year
openssl x509 -req -days 365 -in mobile-cert.csr -signkey mobile-cert.key -out mobile-cert.pem -extensions v3_req -extfile mobile-cert.conf

echo Certificate generated successfully!
echo Files created:
echo - mobile-cert.key (private key)
echo - mobile-cert.pem (certificate)
echo.
echo Copy mobile-cert.pem to your mobile device for installation.
pause