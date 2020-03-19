import urllib2
import globals
import json
import jwt
from jwt.contrib.algorithms.pycrypto import RSAAlgorithm
from Crypto.PublicKey import RSA
from base64 import b64decode
import struct


# Returns true upon authentication success
# Returns false upon authentication fails
def verify_token(token):

    #decrypt the identifying token passed from the cognito userpool, to the front end app, to here
    #more info: http://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-with-identity-providers.html

    # Register RS256 if needed
    try:
        jwt.register_algorithm('RS256', RSAAlgorithm(RSAAlgorithm.SHA256))
    except ValueError:
        # RS256 is registered already
        pass

    #pulls the kid (key ID) from the token
    #to see if it maps to the userpool's JWT set, found at globals.userpool
    #this confirms that the token is from AWS
    kid = get_kid(token)

    if kid not in globals.user_pool:
        get_user_pool()
    # Right now, N and E are base64 encoded.
    n_encoded = get_n_encoded(kid)
    e_encoded = get_e_encoded(kid)

    # Convert into regular 8-bit bytes
    n_decoded = b64decode(format_base64(n_encoded))
    e_decoded = b64decode(format_base64(e_encoded))

    # Convert each byte into length of 2 hexadecimal string
    # Finally concatnate all these strings into one big hex number
    n_hex = '0x' + ''.join(['%02X' % struct.unpack('B', x)[0] for x in n_decoded])
    e_hex = '0x' + ''.join(['%02X' % struct.unpack('B', x)[0] for x in e_decoded])

    # Use python interpreter to eval the big hex number
    # Note that python has unlimited accuracy in big number
    # Numbers will never overflow (Given enough memory)
    n_val = eval(n_hex)
    e_val = eval(e_hex)

    # All these claim fields' descriptions can be found here:
    # https://self-issued.info/docs/draft-ietf-oauth-json-web-token.html#rfc.section.4.1
    verify_options = {
       'verify_signature': True,
       'verify_exp': True,
       'verify_nbf': True,
       'verify_iat': True,
       'verify_aud': False,
       'require_exp': True,
       'require_iat': True,
       'require_nbf': False
    }

    key_pub = RSA.construct((long(n_val), long(e_val)))

    try:
        jwt.decode(token, key=key_pub, options=verify_options)
        return True
    except Exception as e:
        return False


def get_kid(token):
    kid = jwt.get_unverified_header(token)['kid']
    return kid


def get_n_encoded(kid):
    return globals.user_pool[kid]['n']


def get_e_encoded(kid):
    return globals.user_pool[kid]['e']


def get_user_pool():
    response = urllib2.urlopen(globals.user_pool_url)
    data = response.read()
    values = json.loads(data)

    for v in values['keys']:
        globals.user_pool[v['kid']] = v


# For some reasons,
# the RSA public key's Modulo(n) and Exponent(e) in AWS Cognito JWT base64 format has been modified as below:
#   1. Trailing padding '=' trimmed (Could have length of 1 ~ 4 paddings)
#   2. '+' replaced by '-'
#   3. '/' replaced by '_'
# So here we reverse the changes.
def format_base64(raw):
    fresh = raw
    if len(fresh) % 4 != 0:
        fresh += "===="[len(fresh) % 4:]
    fresh = fresh.replace("_", "/")
    fresh = fresh.replace("-", "+")
    return fresh
