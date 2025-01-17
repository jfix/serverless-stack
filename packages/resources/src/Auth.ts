import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as cognito from "@aws-cdk/aws-cognito";

import { App } from "./App";
import { Permissions, attachPermissionsToRole } from "./util/permission";

export interface AuthProps {
  readonly cognito?: AuthCognitoProps;
  readonly cognitoUserPool?: cognito.IUserPool;
  readonly cognitoUserPoolClient?: cognito.IUserPoolClient;
  readonly auth0?: AuthAuth0Props;
  readonly amazon?: AuthAmazonProps;
  readonly apple?: AuthAppleProps;
  readonly facebook?: AuthFacebookProps;
  readonly google?: AuthGoogleProps;
  readonly twitter?: AuthTwitterProps;
}

export interface AuthCognitoProps {
  readonly signInAliases: cognito.SignInAliases;
}

export interface AuthAuth0Props {
  readonly domain: string;
  readonly clientId: string;
}

export interface AuthAmazonProps {
  readonly appId: string;
}

export interface AuthAppleProps {
  readonly servicesId: string;
}

export interface AuthFacebookProps {
  readonly appId: string;
}

export interface AuthGoogleProps {
  readonly clientId: string;
}

export interface AuthTwitterProps {
  readonly consumerKey: string;
  readonly consumerSecret: string;
}

export class Auth extends cdk.Construct {
  public readonly cognitoUserPool?: cognito.UserPool;
  public readonly cognitoUserPoolClient?: cognito.UserPoolClient;
  public readonly cognitoCfnIdentityPool: cognito.CfnIdentityPool;
  public readonly iamAuthRole: iam.Role;
  public readonly iamUnauthRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props: AuthProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const {
      cognito: cognitoProps,
      cognitoUserPool,
      cognitoUserPoolClient,
      auth0,
      amazon,
      apple,
      facebook,
      google,
      twitter,
    } = props;

    ////////////////////
    // Handle Cognito Identity Providers (ie. User Pool)
    ////////////////////
    const cognitoIdentityProviders = [];

    // Validate input
    if (cognitoProps !== undefined && cognitoUserPool !== undefined) {
      throw new Error(`Cannot define both cognito and cognitoUserPool`);
    }
    if (cognitoProps !== undefined && cognitoUserPoolClient !== undefined) {
      throw new Error(`Cannot define both cognito and cognitoUserPoolClient`);
    }
    if (
      (cognitoUserPool === undefined && cognitoUserPoolClient !== undefined) ||
      (cognitoUserPool !== undefined && cognitoUserPoolClient === undefined)
    ) {
      throw new Error(
        `Have to define both cognitoUserPool and cognitoUserPoolClient`
      );
    }

    if (cognitoProps) {
      if (!cognitoProps.signInAliases) {
        throw new Error(`No signInAliases defined for cognito in sst.Auth`);
      }

      // Create User Pool
      this.cognitoUserPool = new cognito.UserPool(this, "UserPool", {
        userPoolName: root.logicalPrefixedName(id),
        selfSignUpEnabled: true,
        signInAliases: cognitoProps.signInAliases,
        signInCaseSensitive: false,
      });

      // Create User Pool Client
      this.cognitoUserPoolClient = new cognito.UserPoolClient(
        this,
        "UserPoolClient",
        {
          userPool: this.cognitoUserPool,
        }
      );
    } else if (cognitoUserPool) {
      this.cognitoUserPool = cognitoUserPool as cognito.UserPool;
      this.cognitoUserPoolClient = cognitoUserPoolClient as cognito.UserPoolClient;
    }

    // Set cognito providers
    if (this.cognitoUserPool && this.cognitoUserPoolClient) {
      cognitoIdentityProviders.push({
        providerName: this.cognitoUserPool.userPoolProviderName,
        clientId: this.cognitoUserPoolClient.userPoolClientId,
      });
    }

    ////////////////////
    // Handle OpenId Connect Providers (ie. Auth0)
    ////////////////////
    const openIdConnectProviderArns = [];

    if (auth0) {
      if (!auth0.domain) {
        throw new Error(`No Auth0 domain defined for the "${id}" Auth`);
      }
      if (!auth0.clientId) {
        throw new Error(`No Auth0 clientId defined for the "${id}" Auth`);
      }
      const provider = new iam.OpenIdConnectProvider(this, "Auth0Provider", {
        url: auth0.domain.startsWith("https://")
          ? auth0.domain
          : `https://${auth0.domain}`,
        clientIds: [auth0.clientId],
      });
      openIdConnectProviderArns.push(provider.openIdConnectProviderArn);
    }

    ////////////////////
    // Handle Social Identity Providers
    ////////////////////
    const supportedLoginProviders = {} as { [key: string]: string };

    if (amazon) {
      if (!amazon.appId) {
        throw new Error(`No Amazon appId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["www.amazon.com"] = amazon.appId;
    }
    if (facebook) {
      if (!facebook.appId) {
        throw new Error(`No Facebook appId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["graph.facebook.com"] = facebook.appId;
    }
    if (google) {
      if (!google.clientId) {
        throw new Error(`No Google appId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["accounts.google.com"] = google.clientId;
    }
    if (twitter) {
      if (!twitter.consumerKey) {
        throw new Error(`No Twitter consumer key defined for the "${id}" Auth`);
      }
      if (!twitter.consumerSecret) {
        throw new Error(
          `No Twitter consumer secret defined for the "${id}" Auth`
        );
      }
      supportedLoginProviders[
        "api.twitter.com"
      ] = `${twitter.consumerKey};${twitter.consumerSecret}`;
    }
    if (apple) {
      if (!apple.servicesId) {
        throw new Error(`No Apple servicesId defined for the "${id}" Auth`);
      }
      supportedLoginProviders["appleid.apple.com"] = apple.servicesId;
    }

    ////////////////////
    // Create Identity Pool
    ////////////////////

    // Create Cognito Identity Pool
    this.cognitoCfnIdentityPool = new cognito.CfnIdentityPool(
      this,
      "IdentityPool",
      {
        identityPoolName: root.logicalPrefixedName(id),
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders,
        supportedLoginProviders,
        openIdConnectProviderArns,
      }
    );
    this.iamAuthRole = this.createAuthRole(this.cognitoCfnIdentityPool);
    this.iamUnauthRole = this.createUnauthRole(this.cognitoCfnIdentityPool);

    // Attach roles to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      "IdentityPoolRoleAttachment",
      {
        identityPoolId: this.cognitoCfnIdentityPool.ref,
        roles: {
          authenticated: this.iamAuthRole.roleArn,
          unauthenticated: this.iamUnauthRole.roleArn,
        },
      }
    );
  }

  createAuthRole(identityPool: cognito.CfnIdentityPool): iam.Role {
    const role = new iam.Role(this, "IdentityPoolAuthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "mobileanalytics:PutEvents",
          "cognito-sync:*",
          "cognito-identity:*",
        ],
        resources: ["*"],
      })
    );

    return role;
  }

  createUnauthRole(identityPool: cognito.CfnIdentityPool): iam.Role {
    const role = new iam.Role(this, "IdentityPoolUnauthRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAnyValue:StringLike": {
            "cognito-identity.amazonaws.com:amr": "unauthenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
        resources: ["*"],
      })
    );

    return role;
  }

  attachPermissionsForAuthUsers(permissions: Permissions): void {
    attachPermissionsToRole(this.iamAuthRole, permissions);
  }

  attachPermissionsForUnauthUsers(permissions: Permissions): void {
    attachPermissionsToRole(this.iamUnauthRole, permissions);
  }
}
